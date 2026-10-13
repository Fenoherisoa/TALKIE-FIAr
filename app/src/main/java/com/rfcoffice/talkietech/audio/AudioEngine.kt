package com.rfcoffice.talkietech.audio

import android.annotation.SuppressLint
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread
import kotlin.math.sin
import kotlin.math.sqrt

class AudioEngine {
    val sampleRate = 16000
    private val channelInConfig = AudioFormat.CHANNEL_IN_MONO
    private val channelOutConfig = AudioFormat.CHANNEL_OUT_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    val chunkSize = 640 // 320 samples @ 16kHz = 20ms per packet

    private var audioRecord: AudioRecord? = null
    private var audioTrack: AudioTrack? = null

    private val isRecording = AtomicBoolean(false)
    private val isPlaying = AtomicBoolean(false)

    private val audioPlaybackQueue = ConcurrentLinkedQueue<ByteArray>()
    private var playbackThread: Thread? = null
    private var recordThread: Thread? = null

    var volume: Float = 1.0f
    var soundEffectsEnabled: Boolean = true
    var rogerBeepEnabled: Boolean = true

    // Callbacks
    var onAudioFrameRecorded: ((ByteArray) -> Unit)? = null
    var onMicLevel: ((Float) -> Unit)? = null
    var onPlaybackLevel: ((Float) -> Unit)? = null

    init {
        initAudioTrack()
    }

    private fun initAudioTrack() {
        try {
            val minBuf = AudioTrack.getMinBufferSize(sampleRate, channelOutConfig, audioFormat)
            val bufferSize = maxOf(minBuf, 4096)

            val attributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()

            val format = AudioFormat.Builder()
                .setSampleRate(sampleRate)
                .setEncoding(audioFormat)
                .setChannelMask(channelOutConfig)
                .build()

            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(attributes)
                .setAudioFormat(format)
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            audioTrack?.play()
            startPlaybackWorker()
        } catch (_: Exception) {
        }
    }

    private fun startPlaybackWorker() {
        isPlaying.set(true)
        playbackThread = thread(name = "TalkieAudioPlayer") {
            while (isPlaying.get()) {
                val chunk = audioPlaybackQueue.poll()
                if (chunk != null && chunk.isNotEmpty()) {
                    try {
                        val track = audioTrack
                        if (track != null && track.state == AudioTrack.STATE_INITIALIZED) {
                            if (volume < 1.0f) {
                                val adjusted = applyVolume(chunk, volume)
                                track.write(adjusted, 0, adjusted.size)
                                calculateLevel(adjusted, onPlaybackLevel)
                            } else {
                                track.write(chunk, 0, chunk.size)
                                calculateLevel(chunk, onPlaybackLevel)
                            }
                        }
                    } catch (_: Exception) {
                    }
                } else {
                    try {
                        Thread.sleep(10)
                    } catch (_: InterruptedException) {
                        break
                    }
                }
            }
        }
    }

    fun playAudioFrame(pcm: ByteArray) {
        if (pcm.isNotEmpty()) {
            audioPlaybackQueue.offer(pcm)
        }
    }

    @SuppressLint("MissingPermission")
    fun startRecording(hasPermission: Boolean): Boolean {
        if (!hasPermission || isRecording.get()) return false

        try {
            val minBuf = AudioRecord.getMinBufferSize(sampleRate, channelInConfig, audioFormat)
            val bufferSize = maxOf(minBuf, chunkSize * 4)

            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                sampleRate,
                channelInConfig,
                audioFormat,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                audioRecord?.release()
                audioRecord = null
                return false
            }

            if (soundEffectsEnabled) {
                playPttStartBeep()
            }

            audioRecord?.startRecording()
            isRecording.set(true)

            recordThread = thread(name = "TalkieAudioRecorder") {
                val buffer = ByteArray(chunkSize)
                while (isRecording.get()) {
                    val readBytes = audioRecord?.read(buffer, 0, buffer.size) ?: -1
                    if (readBytes > 0) {
                        val copy = buffer.copyOf(readBytes)
                        onAudioFrameRecorded?.invoke(copy)
                        calculateLevel(copy, onMicLevel)
                    }
                }
            }
            return true
        } catch (e: Exception) {
            stopRecording()
            return false
        }
    }

    fun stopRecording() {
        if (!isRecording.getAndSet(false)) return

        try {
            audioRecord?.stop()
        } catch (_: Exception) {
        }
        try {
            audioRecord?.release()
        } catch (_: Exception) {
        }
        audioRecord = null
        recordThread = null
        onMicLevel?.invoke(0.0f)

        if (soundEffectsEnabled && rogerBeepEnabled) {
            playRogerBeep()
        }
    }

    private fun calculateLevel(pcm: ByteArray, callback: ((Float) -> Unit)?) {
        if (callback == null) return
        var sum = 0.0
        val numSamples = pcm.size / 2
        for (i in 0 until numSamples) {
            val sample = (pcm[i * 2 + 1].toInt() shl 8) or (pcm[i * 2].toInt() and 0xFF)
            sum += sample * sample
        }
        val rms = sqrt(sum / numSamples)
        val level = (rms / 32768.0).toFloat().coerceIn(0.0f, 1.0f) * 3.5f
        callback.invoke(level.coerceAtMost(1.0f))
    }

    private fun applyVolume(pcm: ByteArray, vol: Float): ByteArray {
        val result = ByteArray(pcm.size)
        val numSamples = pcm.size / 2
        for (i in 0 until numSamples) {
            var sample = (pcm[i * 2 + 1].toInt() shl 8) or (pcm[i * 2].toInt() and 0xFF)
            sample = (sample * vol).toInt().coerceIn(-32768, 32767)
            result[i * 2] = (sample and 0xFF).toByte()
            result[i * 2 + 1] = ((sample shr 8) and 0xFF).toByte()
        }
        return result
    }

    fun playPttStartBeep() {
        thread {
            val numSamples = (sampleRate * 0.06).toInt() // 60ms
            val pcm = ByteArray(numSamples * 2)
            for (i in 0 until numSamples) {
                val t = i.toDouble() / sampleRate
                val freq = 880.0 + (1320.0 - 880.0) * (i.toDouble() / numSamples)
                val sample = (sin(2.0 * Math.PI * freq * t) * 7000.0 * (1.0 - i.toDouble() / numSamples)).toInt()
                pcm[i * 2] = (sample and 0xFF).toByte()
                pcm[i * 2 + 1] = ((sample shr 8) and 0xFF).toByte()
            }
            audioTrack?.write(pcm, 0, pcm.size)
        }
    }

    fun playRogerBeep() {
        thread {
            val numTone1 = (sampleRate * 0.06).toInt()
            val numTone2 = (sampleRate * 0.08).toInt()
            val totalSamples = numTone1 + numTone2
            val pcm = ByteArray(totalSamples * 2)

            for (i in 0 until numTone1) {
                val t = i.toDouble() / sampleRate
                val sample = (sin(2.0 * Math.PI * 1180.0 * t) * 8000.0).toInt()
                pcm[i * 2] = (sample and 0xFF).toByte()
                pcm[i * 2 + 1] = ((sample shr 8) and 0xFF).toByte()
            }
            for (i in 0 until numTone2) {
                val idx = numTone1 + i
                val t = i.toDouble() / sampleRate
                val decay = 1.0 - (i.toDouble() / numTone2) * 0.5
                val sample = (sin(2.0 * Math.PI * 1540.0 * t) * 8000.0 * decay).toInt()
                pcm[idx * 2] = (sample and 0xFF).toByte()
                pcm[idx * 2 + 1] = ((sample shr 8) and 0xFF).toByte()
            }
            audioTrack?.write(pcm, 0, pcm.size)
        }
    }

    fun release() {
        stopRecording()
        isPlaying.set(false)
        audioPlaybackQueue.clear()
        try {
            audioTrack?.stop()
            audioTrack?.release()
        } catch (_: Exception) {
        }
        audioTrack = null
    }
}
