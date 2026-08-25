package com.voidmsg.messenger.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import com.voidmsg.messenger.MainActivity
import com.voidmsg.messenger.ble.BleCarrierAdvertiser

/**
 * Foreground Service que mantém o VØID Messenger vivo em background.
 *
 * Responsabilidades:
 * - BLE advertising persistente (descoberta de peers)
 * - Heartbeat Nostr (kind 31219) a cada 30s
 * - Receber tarefas Animus (kind 31222/31228) em background
 */
class AnimusForegroundService : Service() {

    companion object {
        const val ACTION_START = "com.voidmsg.messenger.ANIMUS_START"
        const val ACTION_STOP = "com.voidmsg.messenger.ANIMUS_STOP"
        const val CHANNEL_ID = "void_animus_channel"
        const val NOTIFICATION_ID = 1337
    }

    private var isRunning = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startForegroundService()
            ACTION_STOP -> stopForegroundService()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startForegroundService() {
        if (isRunning) return
        isRunning = true

        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)

        BleCarrierAdvertiser.start("void_hcn_heartbeat")

        println("[AnimusService] VØID Animus started — BLE carrier + foreground")
    }

    private fun stopForegroundService() {
        isRunning = false
        BleCarrierAdvertiser.stop()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        println("[AnimusService] VØID Animus stopped")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "VØID Animus",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Mantém o VØID Messenger ativo para proteção de rede"
                setShowBadge(false)
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        return builder
            .setContentTitle("VØID está protegendo sua rede")
            .setContentText("Animus ativo · BLE · Nostr · QEL")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}
