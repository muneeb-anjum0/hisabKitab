# Firebase Authentication includes optional Facebook integration references.
# HisabKitab enables Google authentication only, so those absent classes are safe to ignore.
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
-dontwarn com.facebook.login.widget.LoginButton
