package com.rfcoffice.talkietech.network

import android.content.Context
import android.net.wifi.WifiManager
import android.os.PowerManager
import com.rfcoffice.talkietech.model.Channel
import com.rfcoffice.talkietech.model.Participant
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.SocketException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread

class UdpNetworkManager(private val context: Context) {
    val port = 45454
    private val isRunning = AtomicBoolean(false)
    private var sendSocket: DatagramSocket? = null
    private var receiveSocket: DatagramSocket? = null
    private var multicastLock: WifiManager.MulticastLock? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private var currentChannel = Channel("TECH-01", "Canal 01 — Général")
    private var currentUserId = "USER-" + (1000..9999).random()
    private var currentUserName = "TECH-USER"
    private var isTransmitting = false

    private val seqCounter = AtomicInteger(0)
    private val participants = ConcurrentHashMap<String, Participant>()

    // Callbacks
    var onAudioPacketReceived: ((TalkiePacket) -> Unit)? = null
    var onParticipantsChanged: ((List<Participant>) -> Unit)? = null
    var onStationSpeakingState: ((String, String, Boolean) -> Unit)? = null
    var onError: ((String) -> Unit)? = null

    private var receiveThread: Thread? = null
    private var heartbeatThread: Thread? = null

    fun setConfig(userId: String, userName: String, channel: Channel) {
        currentUserId = userId
        currentUserName = userName
        currentChannel = channel
        participants.clear()
        onParticipantsChanged?.invoke(emptyList())
    }

    fun start(): Boolean {
        if (isRunning.get()) return true

        return try {
            val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            multicastLock = wm.createMulticastLock("talkietech:multicast").apply {
                setReferenceCounted(false)
                acquire()
            }

            val pm = context.applicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "talkietech:wakelock").apply {
                setReferenceCounted(false)
                acquire(10 * 60 * 1000L) // 10 minutes max safe window
            }

            sendSocket = DatagramSocket().apply {
                broadcast = true
            }

            receiveSocket = DatagramSocket(null).apply {
                reuseAddress = true
                broadcast = true
                soTimeout = 0
                bind(InetSocketAddress(port))
            }

            isRunning.set(true)
            startReceiveLoop()
            startHeartbeatLoop()
            true
        } catch (e: Exception) {
            stop()
            onError?.invoke("Erreur d'initialisation réseau Wi-Fi: ${e.javaClass.simpleName}")
            false
        }
    }

    private fun startReceiveLoop() {
        receiveThread = thread(name = "TalkieUdpReceiver") {
            val buffer = ByteArray(4096)
            while (isRunning.get()) {
                try {
                    val socket = receiveSocket ?: break
                    val datagram = DatagramPacket(buffer, buffer.size)
                    socket.receive(datagram)

                    val packet = TalkiePacket.deserialize(datagram.data, datagram.length) ?: continue

                    // Don't process our own broadcast
                    if (packet.userId == currentUserId) continue

                    // Channel check
                    if (packet.channelId != currentChannel.id) continue

                    // Private channel token verification
                    if (currentChannel.isPrivate) {
                        val expectedToken = currentChannel.passwordHash ?: ""
                        if (packet.token != expectedToken) {
                            // Ignored: unauthorized packet on private channel
                            continue
                        }
                    }

                    handleIncomingPacket(packet)
                } catch (_: SocketException) {
                    break
                } catch (e: Exception) {
                    if (isRunning.get()) {
                        onError?.invoke("Erreur de réception : ${e.message}")
                    }
                }
            }
        }
    }

    private fun handleIncomingPacket(packet: TalkiePacket) {
        val now = System.currentTimeMillis()
        val isSpeaking = packet.type == TalkiePacket.TYPE_AUDIO || packet.type == TalkiePacket.TYPE_PTT_START

        participants[packet.userId] = Participant(
            id = packet.userId,
            name = packet.userName,
            channelId = packet.channelId,
            lastSeen = now,
            isSpeaking = isSpeaking
        )

        onParticipantsChanged?.invoke(participants.values.toList())

        when (packet.type) {
            TalkiePacket.TYPE_PTT_START -> {
                onStationSpeakingState?.invoke(packet.userId, packet.userName, true)
            }
            TalkiePacket.TYPE_PTT_END -> {
                onStationSpeakingState?.invoke(packet.userId, packet.userName, false)
            }
            TalkiePacket.TYPE_AUDIO -> {
                onStationSpeakingState?.invoke(packet.userId, packet.userName, true)
                onAudioPacketReceived?.invoke(packet)
            }
        }
    }

    private fun startHeartbeatLoop() {
        heartbeatThread = thread(name = "TalkieHeartbeat") {
            while (isRunning.get()) {
                try {
                    sendHeartbeat()
                    pruneStaleParticipants()
                    Thread.sleep(2500)
                } catch (_: InterruptedException) {
                    break
                } catch (_: Exception) {
                }
            }
        }
    }

    private fun pruneStaleParticipants() {
        val now = System.currentTimeMillis()
        var changed = false
        val iterator = participants.entries.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            if (now - entry.value.lastSeen > 7000) {
                iterator.remove()
                changed = true
            }
        }
        if (changed) {
            onParticipantsChanged?.invoke(participants.values.toList())
        }
    }

    fun sendAudio(audioBytes: ByteArray) {
        if (!isRunning.get()) return
        val packet = TalkiePacket(
            type = TalkiePacket.TYPE_AUDIO,
            seq = seqCounter.incrementAndGet(),
            channelId = currentChannel.id,
            userId = currentUserId,
            userName = currentUserName,
            isPrivate = currentChannel.isPrivate,
            token = currentChannel.passwordHash ?: "",
            audioData = audioBytes
        )
        sendPacket(packet)
    }

    fun sendPttStart() {
        isTransmitting = true
        val packet = TalkiePacket(
            type = TalkiePacket.TYPE_PTT_START,
            seq = seqCounter.incrementAndGet(),
            channelId = currentChannel.id,
            userId = currentUserId,
            userName = currentUserName,
            isPrivate = currentChannel.isPrivate,
            token = currentChannel.passwordHash ?: ""
        )
        sendPacket(packet)
    }

    fun sendPttEnd() {
        isTransmitting = false
        val packet = TalkiePacket(
            type = TalkiePacket.TYPE_PTT_END,
            seq = seqCounter.incrementAndGet(),
            channelId = currentChannel.id,
            userId = currentUserId,
            userName = currentUserName,
            isPrivate = currentChannel.isPrivate,
            token = currentChannel.passwordHash ?: ""
        )
        sendPacket(packet)
    }

    private fun sendHeartbeat() {
        val packet = TalkiePacket(
            type = TalkiePacket.TYPE_HEARTBEAT,
            seq = seqCounter.incrementAndGet(),
            channelId = currentChannel.id,
            userId = currentUserId,
            userName = currentUserName,
            isPrivate = currentChannel.isPrivate,
            token = currentChannel.passwordHash ?: ""
        )
        sendPacket(packet)
    }

    private fun sendPacket(packet: TalkiePacket) {
        thread {
            try {
                val bytes = TalkiePacket.serialize(packet)
                val dest = InetAddress.getByName("255.255.255.255")
                val datagram = DatagramPacket(bytes, bytes.size, dest, port)
                sendSocket?.send(datagram)
            } catch (_: Exception) {
            }
        }
    }

    fun stop() {
        isRunning.set(false)
        try {
            sendSocket?.close()
        } catch (_: Exception) {
        }
        sendSocket = null

        try {
            receiveSocket?.close()
        } catch (_: Exception) {
        }
        receiveSocket = null

        try {
            multicastLock?.release()
        } catch (_: Exception) {
        }
        multicastLock = null

        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (_: Exception) {
        }
        wakeLock = null

        participants.clear()
        onParticipantsChanged?.invoke(emptyList())
    }
}
