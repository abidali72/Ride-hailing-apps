package com.zaara.app.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.AlphaAnimation
import android.view.animation.AnimationSet
import android.view.animation.ScaleAnimation
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.zaara.app.R
import com.zaara.app.api.RetrofitClient
import com.zaara.app.ui.rider.RiderMainActivity
import com.zaara.app.ui.driver.DriverMainActivity
import com.zaara.app.utils.PrefsManager

@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val logo = findViewById<TextView>(R.id.logoText)
        val tagline = findViewById<TextView>(R.id.taglineText)

        // Animate logo
        val scaleUp = ScaleAnimation(0.5f, 1f, 0.5f, 1f,
            ScaleAnimation.RELATIVE_TO_SELF, 0.5f,
            ScaleAnimation.RELATIVE_TO_SELF, 0.5f).apply { duration = 800 }
        val fadeIn = AlphaAnimation(0f, 1f).apply { duration = 800 }
        val animSet = AnimationSet(true).apply {
            addAnimation(scaleUp)
            addAnimation(fadeIn)
        }
        logo.startAnimation(animSet)

        // Animate tagline with delay
        tagline.alpha = 0f
        tagline.animate().alpha(1f).setStartDelay(600).setDuration(600).start()

        Handler(Looper.getMainLooper()).postDelayed({
            navigateNext()
        }, 2000)
    }

    private fun navigateNext() {
        if (PrefsManager.isLoggedIn(this)) {
            val token = PrefsManager.getToken(this)
            RetrofitClient.setToken(token)
            
            when (PrefsManager.getUserRole(this)) {
                "rider" -> startActivity(Intent(this, RiderMainActivity::class.java))
                "driver" -> startActivity(Intent(this, DriverMainActivity::class.java))
                else -> startActivity(Intent(this, LoginActivity::class.java))
            }
        } else {
            startActivity(Intent(this, LoginActivity::class.java))
        }
        finish()
    }
}
