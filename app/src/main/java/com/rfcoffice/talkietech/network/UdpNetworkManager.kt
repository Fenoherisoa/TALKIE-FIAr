package com.rfcoffice.talkietech.network

import android.content.Context
import android.net.wifi.WifiManager
import android.os.PowerManager
import android.util.Log
import com.rfcoffice.talkietech.model.Channel
import com.rfcoffice.talkietech.model.Participant
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.SocketException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread

class UdpNetworkManager(private val context: Context) {

    companion object {
        const val TAG = "TALKIE_WIFI"
        const val DEFAULT_PORT = 45454
    }

    val port = DEFAULT_PORT
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
        Log.i(TAG, "Configuration mise à jour: user=$currentUserName, channel=${currentChannel.name}")
    }

    fun start(): Boolean {
        if (isRunning.get()) {
            Log.d(TAG, "UdpNetworkManager est déjà en cours d'exécution.")
            return true
        }

        var currentStep = "Vérification des paramètres"
        return try {
            currentStep = "Acquisition MulticastLock"
            acquireMulticastLock()

            currentStep = "Acquisition WakeLock"
            acquireWakeLock()

            currentStep = "Création du socket d'émission UDP"
            // Forçage de l'adresse IPv4 0.0.0.0 pour éviter les conflits IPv6/IPv4
            val localSendAddress = InetSocketAddress(InetAddress.getByName("0.0.0.0"), 0)
            sendSocket = DatagramSocket(null).apply {
                reuseAddress = true
                bind(localSendAddress)
                try {
                    broadcast = true
                } catch (e: Exception) {
                    Log.w(TAG, "Option broadcast sur sendSocket: ${e.message}")
                }
            }

            currentStep = "Création du socket d'écoute UDP (port $port)"
            // Liaison explicite à l'adresse wildcard IPv4 0.0.0.0 sur le port d'écoute
            val localBindAddress = InetSocketAddress(InetAddress.getByName("0.0.0.0"), port)
            receiveSocket = DatagramSocket(null).apply {
                reuseAddress = true
                soTimeout = 0
                bind(localBindAddress)
                try {
                    broadcast = true
                } catch (e: Exception) {
                    Log.w(TAG, "Option broadcast sur receiveSocket: ${e.message}")
                }
            }

            isRunning.set(true)
            startReceiveLoop()
            startHeartbeatLoop()
            Log.i(TAG, "Réseau UDP Wi-Fi initialisé avec succès sur le port $port (IPv4).")
            true
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "IllegalArgumentException lors de [$currentStep]: ${e.message}", e)
            stop()
            onError?.invoke("Erreur d'initialisation réseau Wi-Fi: Paramètre invalide ($currentStep - ${e.message ?: "Argument illégal"})")
            false
        } catch (e: SocketException) {
            Log.e(TAG, "SocketException lors de [$currentStep]: ${e.message}", e)
            stop()
            onError?.invoke("Erreur d'initialisation réseau Wi-Fi: Conflit socket (${e.message ?: "Port déjà utilisé"})")
            false
        } catch (e: Exception) {
            Log.e(TAG, "Exception lors de [$currentStep]: ${e.javaClass.simpleName} - ${e.message}", e)
            stop()
            onError?.invoke("Erreur d'initialisation réseau Wi-Fi: ${e.javaClass.simpleName} (${e.message ?: "Échec de connexion"})")
            false
        }
    }

    private fun acquireMulticastLock() {
        try {
            val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            if (wm != null) {
                multicastLock = wm.createMulticastLock("talkietech:multicast").apply {
                    setReferenceCounted(false)
                    acquire()
                }
                Log.d(TAG, "MulticastLock acquis avec succès.")
            } else {
                Log.w(TAG, "WifiManager indisponible, poursuite sans MulticastLock.")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Avertissement MulticastLock: ${e.message} (l'application continue)")
        }
    }

    private fun acquireWakeLock() {
        try {
            val pm = context.applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "talkietech:wakelock").apply {
                    setReferenceCounted(false)
                    acquire(10 * 60 * 1000L) // 10 minutes fenêtre de veille max
                }
                Log.d(TAG, "WakeLock acquis avec succès.")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Avertissement WakeLock: ${e.message} (l'application continue)")
        }
    }

    private fun startReceiveLoop() {
        receiveThread = thread(name = "TalkieUdpReceiver") {
            val buffer = ByteArray(4096)
            Log.d(TAG, "Boucle de réception UDP démarrée sur le port $port.")
            while (isRunning.get()) {
                try {
                    val socket = receiveSocket ?: break
                    val datagram = DatagramPacket(buffer, buffer.size)
                    socket.receive(datagram)

                    if (datagram.length <= 0 || datagram.length > buffer.size) continue

                    val packet = TalkiePacket.deserialize(datagram.data, datagram.length) ?: continue

                    // Filtrer notre propre émission
                    if (packet.userId == currentUserId) continue

                    // Vérification du canal virtuel
                    if (packet.channelId != currentChannel.id) continue

                    // Vérification du jeton si canal privé
                    if (currentChannel.isPrivate) {
                        val expectedToken = currentChannel.passwordHash ?: ""
                        if (packet.token != expectedToken) {
                            continue
                        }
                    }

                    handleIncomingPacket(packet)
                } catch (_: SocketException) {
                    // Socket fermé normalement lors de stop()
                    break
                } catch (e: Exception) {
                    if (isRunning.get()) {
                        Log.w(TAG, "Erreur dans la boucle de réception: ${e.message}")
                    }
                }
            }
            Log.d(TAG, "Boucle de réception UDP terminée.")
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
                Log.d(TAG, "Début d'émission PTT de ${packet.userName}")
                onStationSpeakingState?.invoke(packet.userId, packet.userName, true)
            }
            TalkiePacket.TYPE_PTT_END -> {
                Log.d(TAG, "Fin d'émission PTT de ${packet.userName}")
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
                } catch (e: Exception) {
                    Log.w(TAG, "Erreur dans la boucle de présence heartbeat: ${e.message}")
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
        if (!isRunning.get() || audioBytes.isEmpty()) return
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

    /**
     * Récupère toutes les adresses de broadcast du réseau local (Wi-Fi, Hotspot et 255.255.255.255).
     * Cela résout l'erreur ENETUNREACH lorsque le réseau n'a pas de passerelle Internet par défaut.
     */
    private fun getBroadcastAddresses(): List<InetAddress> {
        val broadcastList = LinkedHashSet<InetAddress>()
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces != null && interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                if (networkInterface.isLoopback || !networkInterface.isUp) continue

                for (interfaceAddress in networkInterface.interfaceAddresses) {
                    val broadcast = interfaceAddress.broadcast
                    if (broadcast != null) {
                        broadcastList.add(broadcast)
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Impossible d'énumérer les interfaces pour les adresses broadcast: ${e.message}")
        }

        // Toujours inclure l'adresse de broadcast globale en fallback
        try {
            broadcastList.add(InetAddress.getByName("255.255.255.255"))
        } catch (_: Exception) {}

        return broadcastList.toList()
    }

    private fun sendPacket(packet: TalkiePacket) {
        val socket = sendSocket ?: return
        thread(name = "TalkieUdpSender") {
            try {
                val bytes = TalkiePacket.serialize(packet)
                val destinations = getBroadcastAddresses()
                for (dest in destinations) {
                    try {
                        val datagram = DatagramPacket(bytes, bytes.size, dest, port)
                        socket.send(datagram)
                    } catch (e: Exception) {
                        // Ignorer les erreurs d'interface individuelle
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Erreur lors de l'envoi du paquet: ${e.message}")
            }
        }
    }

    fun stop() {
        isRunning.set(false)
        try {
            sendSocket?.close()
        } catch (_: Exception) {}
        sendSocket = null

        try {
            receiveSocket?.close()
        } catch (_: Exception) {}
        receiveSocket = null

        try {
            if (multicastLock?.isHeld == true) {
                multicastLock?.release()
            }
        } catch (_: Exception) {}
        multicastLock = null

        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) {}
        wakeLock = null

        participants.clear()
        onParticipantsChanged?.invoke(emptyList())
        Log.i(TAG, "UdpNetworkManager arrêté et ressources libérées.")
    }
}
