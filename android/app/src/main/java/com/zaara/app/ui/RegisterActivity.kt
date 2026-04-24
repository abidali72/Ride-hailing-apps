package com.zaara.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.textfield.TextInputEditText
import com.zaara.app.R
import com.zaara.app.api.RetrofitClient
import com.zaara.app.ui.rider.RiderMainActivity
import com.zaara.app.ui.driver.DriverMainActivity
import com.zaara.app.utils.PrefsManager
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {

    private lateinit var nameInput: TextInputEditText
    private lateinit var phoneInput: TextInputEditText
    private lateinit var emailInput: TextInputEditText
    private lateinit var roleGroup: ChipGroup
    private lateinit var registerBtn: MaterialButton
    private lateinit var statusText: TextView
    private lateinit var progressBar: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        nameInput = findViewById(R.id.nameInput)
        phoneInput = findViewById(R.id.phoneInput)
        emailInput = findViewById(R.id.emailInput)
        roleGroup = findViewById(R.id.roleGroup)
        registerBtn = findViewById(R.id.registerBtn)
        statusText = findViewById(R.id.statusText)
        progressBar = findViewById(R.id.progressBar)

        registerBtn.setOnClickListener { register() }
        findViewById<View>(R.id.backBtn).setOnClickListener { finish() }
    }

    private fun register() {
        val name = nameInput.text.toString().trim()
        val phone = phoneInput.text.toString().trim()
        val email = emailInput.text.toString().trim()

        if (name.isEmpty()) { nameInput.error = "Name required"; return }
        if (phone.length < 10) { phoneInput.error = "Valid phone required"; return }

        val selectedChipId = roleGroup.checkedChipId
        if (selectedChipId == View.NO_ID) {
            statusText.text = "Please select Rider or Driver"
            statusText.visibility = View.VISIBLE
            return
        }
        val role = if (selectedChipId == R.id.chipRider) "rider" else "driver"

        progressBar.visibility = View.VISIBLE
        registerBtn.isEnabled = false

        lifecycleScope.launch {
            try {
                val body = mutableMapOf("name" to name, "phone" to phone, "role" to role)
                if (email.isNotEmpty()) body["email"] = email

                val response = RetrofitClient.api.register(body)
                if (response.isSuccessful) {
                    val authResponse = response.body()
                    if (authResponse?.success == true && authResponse.token != null) {
                        RetrofitClient.setToken(authResponse.token)
                        val user = authResponse.user!!
                        PrefsManager.saveAuth(this@RegisterActivity, authResponse.token,
                            user.id, user.name, user.phone, user.role, user.rating ?: 5.0)

                        val intent = if (role == "driver") Intent(this@RegisterActivity, DriverMainActivity::class.java)
                                     else Intent(this@RegisterActivity, RiderMainActivity::class.java)
                        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        startActivity(intent)
                        finish()
                    }
                } else {
                    statusText.text = "Registration failed. Phone may already be registered."
                    statusText.setTextColor(getColor(R.color.status_offline))
                    statusText.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                statusText.text = "Network error: ${e.message}"
                statusText.setTextColor(getColor(R.color.status_offline))
                statusText.visibility = View.VISIBLE
            }
            progressBar.visibility = View.GONE
            registerBtn.isEnabled = true
        }
    }
}
