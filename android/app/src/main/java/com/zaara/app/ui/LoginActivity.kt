package com.zaara.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.zaara.app.R
import com.zaara.app.api.RetrofitClient
import com.zaara.app.ui.rider.RiderMainActivity
import com.zaara.app.ui.driver.DriverMainActivity
import com.zaara.app.utils.PrefsManager
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var phoneInput: TextInputEditText
    private lateinit var otpInput: TextInputEditText
    private lateinit var otpSection: LinearLayout
    private lateinit var sendOtpBtn: MaterialButton
    private lateinit var verifyOtpBtn: MaterialButton
    private lateinit var registerBtn: MaterialButton
    private lateinit var statusText: TextView
    private lateinit var demoSection: LinearLayout
    private lateinit var demoRiderBtn: MaterialButton
    private lateinit var demoDriverBtn: MaterialButton
    private lateinit var progressBar: ProgressBar

    private var currentPhone = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        phoneInput = findViewById(R.id.phoneInput)
        otpInput = findViewById(R.id.otpInput)
        otpSection = findViewById(R.id.otpSection)
        sendOtpBtn = findViewById(R.id.sendOtpBtn)
        verifyOtpBtn = findViewById(R.id.verifyOtpBtn)
        registerBtn = findViewById(R.id.registerBtn)
        statusText = findViewById(R.id.statusText)
        demoSection = findViewById(R.id.demoSection)
        demoRiderBtn = findViewById(R.id.demoRiderBtn)
        demoDriverBtn = findViewById(R.id.demoDriverBtn)
        progressBar = findViewById(R.id.progressBar)

        sendOtpBtn.setOnClickListener { sendOtp() }
        verifyOtpBtn.setOnClickListener { verifyOtp() }
        registerBtn.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }

        // Demo login buttons
        demoRiderBtn.setOnClickListener { demoLogin("+923001234567") }
        demoDriverBtn.setOnClickListener { demoLogin("+923011112222") }
    }

    private fun sendOtp() {
        val phone = phoneInput.text.toString().trim()
        if (phone.length < 10) {
            phoneInput.error = "Enter valid phone number"
            return
        }
        currentPhone = phone
        showLoading(true)

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.sendOtp(mapOf("phone" to phone))
                if (response.isSuccessful && response.body()?.success == true) {
                    otpSection.visibility = View.VISIBLE
                    sendOtpBtn.visibility = View.GONE
                    statusText.text = "OTP sent! Use code: 1234"
                    statusText.visibility = View.VISIBLE
                } else {
                    showError("Failed to send OTP")
                }
            } catch (e: Exception) {
                showError("Network error: ${e.message}")
            }
            showLoading(false)
        }
    }

    private fun verifyOtp() {
        val otp = otpInput.text.toString().trim()
        if (otp.length != 4) {
            otpInput.error = "Enter 4-digit OTP"
            return
        }
        showLoading(true)

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.verifyOtp(mapOf("phone" to currentPhone, "otp" to otp))
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true && body.token != null && body.user != null) {
                        handleLoginSuccess(body.token, body.user!!.id, body.user!!.name,
                            body.user!!.phone, body.user!!.role, body.user!!.rating ?: 5.0)
                        
                        body.driver?.let {
                            PrefsManager.saveDriverInfo(this@LoginActivity, it.id, it.vehicleType, it.vehicleNumber)
                        }
                        navigateToHome(body.user!!.role)
                    } else if (body?.needsRegistration == true) {
                        showError("Not registered. Please create an account first.")
                        registerBtn.visibility = View.VISIBLE
                    }
                } else {
                    showError("Invalid OTP")
                }
            } catch (e: Exception) {
                showError("Network error: ${e.message}")
            }
            showLoading(false)
        }
    }

    private fun demoLogin(phone: String) {
        showLoading(true)
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.login(mapOf("phone" to phone))
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true && body.token != null && body.user != null) {
                        handleLoginSuccess(body.token, body.user!!.id, body.user!!.name,
                            body.user!!.phone, body.user!!.role, body.user!!.rating ?: 5.0)
                        
                        body.driver?.let {
                            PrefsManager.saveDriverInfo(this@LoginActivity, it.id, it.vehicleType, it.vehicleNumber)
                        }
                        navigateToHome(body.user!!.role)
                    }
                } else {
                    showError("Login failed")
                }
            } catch (e: Exception) {
                showError("Cannot connect to server.\nMake sure backend is running on port 3000")
            }
            showLoading(false)
        }
    }

    private fun handleLoginSuccess(token: String, id: String, name: String, phone: String, role: String, rating: Double) {
        RetrofitClient.setToken(token)
        PrefsManager.saveAuth(this, token, id, name, phone, role, rating)
    }

    private fun navigateToHome(role: String) {
        val intent = when (role) {
            "rider" -> Intent(this, RiderMainActivity::class.java)
            "driver" -> Intent(this, DriverMainActivity::class.java)
            else -> Intent(this, RiderMainActivity::class.java)
        }
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun showError(message: String) {
        statusText.text = message
        statusText.setTextColor(getColor(R.color.status_offline))
        statusText.visibility = View.VISIBLE
    }

    private fun showLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        sendOtpBtn.isEnabled = !loading
        verifyOtpBtn.isEnabled = !loading
        demoRiderBtn.isEnabled = !loading
        demoDriverBtn.isEnabled = !loading
    }
}
