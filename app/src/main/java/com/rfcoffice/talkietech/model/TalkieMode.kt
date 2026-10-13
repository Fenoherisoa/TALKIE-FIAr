package com.rfcoffice.talkietech.model

enum class TalkieMode(val titleResId: Int) {
    TRANSCEIVER(com.rfcoffice.talkietech.R.string.mode_transceiver),
    TRANSMITTER(com.rfcoffice.talkietech.R.string.mode_transmitter),
    RECEIVER(com.rfcoffice.talkietech.R.string.mode_receiver)
}
