package com.rfcoffice.talkietech

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.os.Build
import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.rfcoffice.talkietech.audio.AudioEngine
import com.rfcoffice.talkietech.databinding.ActivityMainBinding
import com.rfcoffice.talkietech.model.Channel
import com.rfcoffice.talkietech.model.Participant
import com.rfcoffice.talkietech.model.TalkieMode
import com.rfcoffice.talkietech.network.UdpNetworkManager
import com.rfcoffice.talkietech.service.TalkieService
import com.rfcoffice.talkietech.ui.ThemeManager

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var audioEngine: AudioEngine
    private lateinit var networkManager: UdpNetworkManager

    private var isConnected = false
    private var isTalking = false
    private var isReceiving = false
    private var isPttLocked = false

    private var currentChannel = Channel.DEFAULT_PUBLIC_CHANNELS[0]
    private var currentMode = TalkieMode.TRANSCEIVER
    private var activeParticipants: List<Participant> = emptyList()

    private val PERMISSION_REQUEST_CODE = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        ThemeManager.applyTheme(this)
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        audioEngine = AudioEngine()
        networkManager = UdpNetworkManager(this)

        setupUI()
        setupListeners()
        setupEngineCallbacks()
        checkPermissions()
    }

    private fun setupUI() {
        val modeTitles = listOf(
            getString(R.string.mode_transceiver),
            getString(R.string.mode_transmitter),
            getString(R.string.mode_receiver)
        )
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, modeTitles)
        binding.spMode.adapter = adapter

        updateChannelDisplay()
        updateStatusDisconnected()
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupListeners() {
        binding.btnConnect.setOnClickListener {
            if (isConnected) stopConnection() else startConnection()
        }

        binding.btnChannels.setOnClickListener {
            showChannelsDialog()
        }

        binding.btnParticipants.setOnClickListener {
            showParticipantsDialog()
        }

        binding.btnSettings.setOnClickListener {
            showSettingsDialog()
        }

        binding.tvAppTitle.setOnClickListener {
            showAboutDialog()
        }

        binding.cbLockPtt.setOnCheckedChangeListener { _, isChecked ->
            if (!isChecked && isTalking) {
                endTalking()
            }
        }

        binding.btnPtt.setOnTouchListener { _, event ->
            if (!isConnected || currentMode == TalkieMode.RECEIVER) return@setOnTouchListener true

            if (binding.cbLockPtt.isChecked) {
                if (event.action == MotionEvent.ACTION_UP) {
                    if (isTalking) endTalking() else beginTalking()
                }
                return@setOnTouchListener true
            }

            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    beginTalking()
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    endTalking()
                    true
                }
                else -> true
            }
        }
    }

    private fun setupEngineCallbacks() {
        audioEngine.onAudioFrameRecorded = { pcm ->
            networkManager.sendAudio(pcm)
        }

        audioEngine.onMicLevel = { lvl ->
            runOnUiThread {
                val progress = (lvl * 100).toInt().coerceIn(0, 100)
                binding.progressBarAudio.progress = progress
                binding.tvVuPercent.text = "$progress%"
            }
        }

        audioEngine.onPlaybackLevel = { lvl ->
            runOnUiThread {
                val progress = (lvl * 100).toInt().coerceIn(0, 100)
                binding.progressBarAudio.progress = progress
                binding.tvVuPercent.text = "$progress%"
            }
        }

        networkManager.onAudioPacketReceived = { packet ->
            if (currentMode != TalkieMode.TRANSMITTER) {
                audioEngine.playAudioFrame(packet.audioData)
            }
        }

        networkManager.onStationSpeakingState = { _, userName, speaking ->
            runOnUiThread {
                isReceiving = speaking
                if (speaking) {
                    binding.tvStatusTitle.text = getString(R.string.status_receiving, userName)
                    binding.tvStatusSubtitle.text = getString(R.string.status_connected_sub, currentChannel.name, safeUserName())
                    binding.viewStatusDot.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.teal_primary))
                    binding.btnPtt.text = getString(R.string.btn_ptt_receiving)
                } else if (!isTalking) {
                    updateStatusConnected()
                }
            }
        }

        networkManager.onParticipantsChanged = { list ->
            runOnUiThread {
                activeParticipants = list
                binding.tvPeerBadge.text = getString(R.string.participants_count, list.size)
            }
        }

        networkManager.onError = { msg ->
            runOnUiThread {
                Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
                binding.tvStatusTitle.text = "Erreur réseau"
                binding.tvStatusSubtitle.text = msg
                binding.viewStatusDot.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.status_red))
            }
        }
    }

    private fun safeUserName(): String {
        return binding.etUsername.text.toString().trim().replace("|", "_").take(20).ifBlank { "TECH-USER" }
    }

    private fun startConnection() {
        if (!hasMicPermission() && currentMode != TalkieMode.RECEIVER) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), PERMISSION_REQUEST_CODE)
            return
        }

        currentMode = when (binding.spMode.selectedItemPosition) {
            1 -> TalkieMode.TRANSMITTER
            2 -> TalkieMode.RECEIVER
            else -> TalkieMode.TRANSCEIVER
        }

        networkManager.setConfig(
            userId = "DEV-" + (1000..9999).random(),
            userName = safeUserName(),
            channel = currentChannel
        )

        val started = networkManager.start()
        if (started) {
            isConnected = true
            binding.btnConnect.text = getString(R.string.btn_disconnect)
            binding.btnConnect.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.ptt_idle))
            binding.btnConnect.setTextColor(ContextCompat.getColor(this, R.color.white))

            binding.etUsername.isEnabled = false
            binding.spMode.isEnabled = false
            binding.btnPtt.isEnabled = currentMode != TalkieMode.RECEIVER

            updateStatusConnected()
            TalkieService.start(this, currentChannel.name)
        }
    }

    private fun stopConnection() {
        if (isTalking) endTalking()
        isConnected = false
        networkManager.stop()
        audioEngine.stopRecording()

        binding.btnConnect.text = getString(R.string.btn_connect)
        binding.btnConnect.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.teal_primary))
        binding.btnConnect.setTextColor(ContextCompat.getColor(this, R.color.dark_background))

        binding.etUsername.isEnabled = true
        binding.spMode.isEnabled = true
        binding.btnPtt.isEnabled = false
        binding.progressBarAudio.progress = 0
        binding.tvVuPercent.text = "0%"

        updateStatusDisconnected()
        TalkieService.stop(this)
    }

    private fun beginTalking() {
        if (isTalking || !isConnected || currentMode == TalkieMode.RECEIVER) return
        isTalking = true
        networkManager.sendPttStart()
        audioEngine.startRecording(hasMicPermission())

        binding.btnPtt.text = getString(R.string.btn_ptt_talking)
        binding.btnPtt.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.ptt_transmitting))
        binding.viewStatusDot.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.status_red))
        binding.tvStatusTitle.text = getString(R.string.status_transmitting)
    }

    private fun endTalking() {
        if (!isTalking) return
        isTalking = false
        audioEngine.stopRecording()
        networkManager.sendPttEnd()

        binding.btnPtt.text = getString(R.string.btn_ptt_idle)
        binding.btnPtt.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.ptt_idle))
        updateStatusConnected()
    }

    private fun updateStatusConnected() {
        binding.tvStatusTitle.text = getString(R.string.status_connected)
        binding.tvStatusSubtitle.text = getString(R.string.status_connected_sub, currentChannel.name, safeUserName())
        binding.viewStatusDot.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.status_green))
        binding.tvCurrentUserDisplay.text = "Poste : ${safeUserName()}"
    }

    private fun updateStatusDisconnected() {
        binding.tvStatusTitle.text = getString(R.string.status_disconnected)
        binding.tvStatusSubtitle.text = getString(R.string.status_disconnected_sub)
        binding.viewStatusDot.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.status_amber))
        binding.tvPeerBadge.text = "0 poste(s)"
    }

    private fun updateChannelDisplay() {
        val typeStr = if (currentChannel.isPrivate) "Privé 🔒" else "Public"
        binding.tvCurrentChannelInfo.text = "Canal : ${currentChannel.name} ($typeStr)"
    }

    private fun showChannelsDialog() {
        val items = Channel.DEFAULT_PUBLIC_CHANNELS.map { it.name }.toMutableList()
        items.add("🔒 Créer / Rejoindre un canal privé…")

        AlertDialog.Builder(this)
            .setTitle(R.string.dialog_channels_title)
            .setItems(items.toTypedArray()) { _, which ->
                if (which < Channel.DEFAULT_PUBLIC_CHANNELS.size) {
                    currentChannel = Channel.DEFAULT_PUBLIC_CHANNELS[which]
                    updateChannelDisplay()
                    if (isConnected) {
                        networkManager.setConfig("DEV-" + (1000..9999).random(), safeUserName(), currentChannel)
                        updateStatusConnected()
                    }
                } else {
                    showPrivateChannelDialog()
                }
            }
            .setNegativeButton("Annuler", null)
            .show()
    }

    private fun showPrivateChannelDialog() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(50, 20, 50, 10)
        }
        val etId = EditText(this).apply {
            hint = "Identifiant (ex. SECRET-01)"
            setSingleLine(true)
        }
        val etPass = EditText(this).apply {
            hint = getString(R.string.password_label)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        layout.addView(etId)
        layout.addView(etPass)

        AlertDialog.Builder(this)
            .setTitle(R.string.create_private_channel)
            .setView(layout)
            .setPositiveButton("Rejoindre") { _, _ ->
                val channelId = etId.text.toString().trim().uppercase().ifBlank { "PRIVE-01" }
                val password = etPass.text.toString().trim()
                if (password.length < 4) {
                    Toast.makeText(this, getString(R.string.invalid_password), Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                currentChannel = Channel(
                    id = channelId,
                    name = "Canal $channelId",
                    isPrivate = true,
                    passwordHash = Channel.hashPassword(password)
                )
                updateChannelDisplay()
                if (isConnected) {
                    networkManager.setConfig("DEV-" + (1000..9999).random(), safeUserName(), currentChannel)
                    updateStatusConnected()
                }
                Toast.makeText(this, getString(R.string.channel_created_success), Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Annuler", null)
            .show()
    }

    private fun showParticipantsDialog() {
        val list = activeParticipants
        val message = if (list.isEmpty()) {
            getString(R.string.no_participants_detected)
        } else {
            list.joinToString("\n") {
                val state = if (it.isSpeaking) " [ÉMISSION ACTIVE]" else " [En veille]"
                "• ${it.name} (${it.id})$state"
            }
        }
        AlertDialog.Builder(this)
            .setTitle(R.string.dialog_participants_title)
            .setMessage(message)
            .setPositiveButton("Fermer", null)
            .show()
    }

    private fun showSettingsDialog() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(50, 20, 50, 20)
        }

        val tvVol = android.widget.TextView(this).apply {
            text = "${getString(R.string.setting_volume)} : ${(audioEngine.volume * 100).toInt()}%"
        }
        val sbVol = SeekBar(this).apply {
            max = 100
            progress = (audioEngine.volume * 100).toInt()
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(sb: SeekBar?, prog: Int, fromUser: Boolean) {
                    audioEngine.volume = prog / 100f
                    tvVol.text = "${getString(R.string.setting_volume)} : $prog%"
                }
                override fun onStartTrackingTouch(sb: SeekBar?) {}
                override fun onStopTrackingTouch(sb: SeekBar?) {}
            })
        }
        val cbBeep = android.widget.CheckBox(this).apply {
            text = getString(R.string.setting_roger_beep)
            isChecked = audioEngine.rogerBeepEnabled
            setOnCheckedChangeListener { _, checked -> audioEngine.rogerBeepEnabled = checked }
        }
        val cbChirp = android.widget.CheckBox(this).apply {
            text = getString(R.string.setting_ptt_chirp)
            isChecked = audioEngine.soundEffectsEnabled
            setOnCheckedChangeListener { _, checked -> audioEngine.soundEffectsEnabled = checked }
        }

        layout.addView(tvVol)
        layout.addView(sbVol)
        layout.addView(cbBeep)
        layout.addView(cbChirp)

        val themeChoices = arrayOf(getString(R.string.theme_light), getString(R.string.theme_dark), getString(R.string.theme_system))
        val currentThemeIndex = when (ThemeManager.getSavedTheme(this)) {
            ThemeManager.THEME_LIGHT -> 0
            ThemeManager.THEME_DARK -> 1
            else -> 2
        }

        AlertDialog.Builder(this)
            .setTitle(R.string.dialog_settings_title)
            .setView(layout)
            .setSingleChoiceItems(themeChoices, currentThemeIndex) { dialog, which ->
                val newMode = when (which) {
                    0 -> ThemeManager.THEME_LIGHT
                    1 -> ThemeManager.THEME_DARK
                    else -> ThemeManager.THEME_SYSTEM
                }
                ThemeManager.setTheme(this, newMode)
                dialog.dismiss()
            }
            .setPositiveButton("Fermer", null)
            .show()
    }

    private fun showAboutDialog() {
        AlertDialog.Builder(this)
            .setTitle(R.string.dialog_about_title)
            .setMessage(getString(R.string.about_text))
            .setPositiveButton("OK", null)
            .show()
    }

    private fun hasMicPermission(): Boolean {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    }

    private fun checkPermissions() {
        val permissions = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            permissions.add(Manifest.permission.NEARBY_WIFI_DEVICES)
        } else {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            requestPermissions(missing.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE && grantResults.isNotEmpty()) {
            if (grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Microphone autorisé.", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, getString(R.string.permission_denied), Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onDestroy() {
        if (isConnected) stopConnection()
        audioEngine.release()
        super.onDestroy()
    }
}
