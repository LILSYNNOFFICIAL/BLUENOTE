# Keep WebView JavaScript interfaces and AndroidX Webkit classes intact under R8 shrinking
-keepattributes *Annotation*,JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-dontwarn androidx.webkit.**
