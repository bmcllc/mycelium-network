package com.voidmsg.messenger.ble

import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.os.ParcelUuid
import android.util.Log
import java.nio.charset.StandardCharsets
import java.util.UUID

/**
 * BLE advertising para Human Carrier Network (HCN).
 * Payload truncado a 26 bytes (limite BLE AD).
 */
object BleCarrierAdvertiser {
    private const val TAG = "BleCarrierAdvertiser"
    private val SERVICE_UUID: ParcelUuid =
        ParcelUuid(UUID.fromString("6e6f-6964-0000-1000-8000-00805f9b34fb"))

    private var advertiser: BluetoothLeAdvertiser? = null
    private var callback: AdvertiseCallback? = null

    fun start(payload: String): Boolean {
        val adapter = BluetoothAdapter.getDefaultAdapter() ?: run {
            Log.w(TAG, "BluetoothAdapter indisponível")
            return false
        }
        if (!adapter.isEnabled) {
            Log.w(TAG, "Bluetooth desligado")
            return false
        }

        stop()

        advertiser = adapter.bluetoothLeAdvertiser ?: run {
            Log.w(TAG, "BLE advertiser não suportado")
            return false
        }

        val bytes = payload.toByteArray(StandardCharsets.UTF_8)
        val truncated = if (bytes.size > 26) bytes.copyOf(26) else bytes

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
            .setConnectable(false)
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addServiceUuid(SERVICE_UUID)
            .addManufacturerData(0xFFFF, truncated)
            .build()

        callback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                Log.i(TAG, "BLE advertising ativo (${truncated.size} bytes)")
            }

            override fun onStartFailure(errorCode: Int) {
                Log.e(TAG, "BLE advertising falhou: $errorCode")
            }
        }

        advertiser?.startAdvertising(settings, data, callback)
        return true
    }

    fun stop() {
        val adv = advertiser
        val cb = callback
        if (adv != null && cb != null) {
            try {
                adv.stopAdvertising(cb)
            } catch (e: Exception) {
                Log.w(TAG, "stopAdvertising: ${e.message}")
            }
        }
        advertiser = null
        callback = null
    }
}
