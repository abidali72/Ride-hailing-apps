package com.zaara.app

import android.app.Application
import org.osmdroid.config.Configuration

class ZaaraApp : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Configure OSMDroid
        Configuration.getInstance().apply {
            userAgentValue = packageName
            osmdroidBasePath = cacheDir
            osmdroidTileCache = cacheDir
        }
    }
}
