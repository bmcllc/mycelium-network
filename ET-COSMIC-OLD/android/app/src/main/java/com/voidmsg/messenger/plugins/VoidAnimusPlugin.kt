package com.voidmsg.messenger.plugins

import android.content.Intent
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.voidmsg.messenger.ble.BleCarrierAdvertiser
import com.voidmsg.messenger.services.AnimusForegroundService

@CapacitorPlugin(name = "VoidAnimus")
class VoidAnimusPlugin : Plugin() {

    @PluginMethod
    fun startAnimusService(call: PluginCall) {
        val context = context ?: run {
            call.reject("Context not available")
            return
        }

        val intent = Intent(context, AnimusForegroundService::class.java).apply {
            action = AnimusForegroundService.ACTION_START
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }

        val ret = JSObject()
        ret.put("started", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun stopAnimusService(call: PluginCall) {
        val context = context ?: run {
            call.reject("Context not available")
            return
        }

        val intent = Intent(context, AnimusForegroundService::class.java).apply {
            action = AnimusForegroundService.ACTION_STOP
        }
        context.startService(intent)

        val ret = JSObject()
        ret.put("stopped", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun updateBleAdvertisingData(call: PluginCall) {
        val payload = call.getString("payload") ?: ""
        val started = BleCarrierAdvertiser.start(payload)
        val ret = JSObject()
        ret.put("advertising", started)
        ret.put("truncated", payload.length > 26)
        call.resolve(ret)
    }

    @PluginMethod
    fun stopBleAdvertising(call: PluginCall) {
        BleCarrierAdvertiser.stop()
        val ret = JSObject()
        ret.put("stopped", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun getDeviceEntropy(call: PluginCall) {
        // Collect hardware entropy for GhostID biometric derivation
        val sb = StringBuilder()
        sb.append(Build.FINGERPRINT)
        sb.append(Build.HARDWARE)
        sb.append(Build.MODEL)
        sb.append(System.nanoTime())
        sb.append(android.os.SystemClock.elapsedRealtimeNanos())

        // Add some random bytes
        val random = java.security.SecureRandom()
        val bytes = ByteArray(32)
        random.nextBytes(bytes)
        sb.append(bytes.joinToString("") { "%02x".format(it) })

        val ret = JSObject()
        ret.put("entropy", sb.toString())
        ret.put("source", "android_hardware")
        call.resolve(ret)
    }
}
