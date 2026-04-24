# Add project specific ProGuard rules here.
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.zaara.app.api.models.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**
