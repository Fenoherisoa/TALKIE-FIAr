package com.rfcoffice.talkietech.network

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream

data class TalkiePacket(
    val type: Byte, // 0 = HEARTBEAT, 1 = AUDIO, 2 = PTT_START, 3 = PTT_END
    val seq: Int,
    val channelId: String,
    val userId: String,
    val userName: String,
    val isPrivate: Boolean,
    val token: String = "",
    val audioData: ByteArray = ByteArray(0)
) {
    companion object {
        const val MAGIC = "TT02"
        const val TYPE_HEARTBEAT: Byte = 0
        const val TYPE_AUDIO: Byte = 1
        const val TYPE_PTT_START: Byte = 2
        const val TYPE_PTT_END: Byte = 3

        fun serialize(packet: TalkiePacket): ByteArray {
            val baos = ByteArrayOutputStream()
            val dos = DataOutputStream(baos)
            dos.write(MAGIC.toByteArray(Charsets.US_ASCII))
            dos.writeByte(packet.type.toInt())
            dos.writeInt(packet.seq)
            dos.writeUTF(packet.channelId)
            dos.writeUTF(packet.userId)
            dos.writeUTF(packet.userName)
            dos.writeBoolean(packet.isPrivate)
            dos.writeUTF(packet.token)
            dos.writeShort(packet.audioData.size)
            if (packet.audioData.isNotEmpty()) {
                dos.write(packet.audioData)
            }
            dos.flush()
            return baos.toByteArray()
        }

        fun deserialize(bytes: ByteArray, length: Int): TalkiePacket? {
            return try {
                if (length < 8) return null
                val bais = ByteArrayInputStream(bytes, 0, length)
                val dis = DataInputStream(bais)
                val magicBytes = ByteArray(4)
                dis.readFully(magicBytes)
                val magic = String(magicBytes, Charsets.US_ASCII)
                if (magic != MAGIC) return null

                val type = dis.readByte()
                val seq = dis.readInt()
                val channelId = dis.readUTF()
                val userId = dis.readUTF()
                val userName = dis.readUTF()
                val isPrivate = dis.readBoolean()
                val token = dis.readUTF()
                val audioLen = dis.readShort().toInt() and 0xFFFF
                val audioData = if (audioLen > 0) {
                    val buf = ByteArray(audioLen)
                    dis.readFully(buf)
                    buf
                } else {
                    ByteArray(0)
                }

                TalkiePacket(
                    type = type,
                    seq = seq,
                    channelId = channelId,
                    userId = userId,
                    userName = userName,
                    isPrivate = isPrivate,
                    token = token,
                    audioData = audioData
                )
            } catch (_: Exception) {
                null
            }
        }
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as TalkiePacket
        if (seq != other.seq) return false
        if (userId != other.userId) return false
        if (channelId != other.channelId) return false
        return true
    }

    override fun hashCode(): Int {
        var result = seq
        result = 31 * result + userId.hashCode()
        result = 31 * result + channelId.hashCode()
        return result
    }
}
