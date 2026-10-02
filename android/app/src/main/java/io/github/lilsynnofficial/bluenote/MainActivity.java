package io.github.lilsynnofficial.bluenote;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_RESULT_CODE = 1001;
    private static final String RELEASE_API_URL =
            "https://api.github.com/repos/LILSYNNOFFICIAL/BLUENOTE/releases/latest";
    private static final String PLAYSTORE_APK_URL =
            "https://github.com/LILSYNNOFFICIAL/BLUENOTE/releases/latest/download/bluenote-playstore.apk";
    private final ExecutorService updateExecutor = Executors.newSingleThreadExecutor();
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#FFFFFF"));
        window.setNavigationBarColor(Color.parseColor("#FFFFFF"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decor = window.getDecorView();
            decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setBackgroundColor(Color.parseColor("#FFFFFF"));

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("file".equals(scheme)) {
                    return false;
                }
                if (uri.getHost() != null) {
                    String host = uri.getHost().toLowerCase();
                    if (host.contains("localhost")
                            || host.contains("127.0.0.1")
                            || host.endsWith("firebaseapp.com")
                            || host.endsWith("web.app")
                            || host.endsWith("google.com")
                            || host.endsWith("googleapis.com")
                            || host.endsWith("lilsynnofficial.github.io")) {
                        return false;
                    }
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;
                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl("file:///android_asset/public/index.html");
            checkForPlaystoreUpdate();
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void checkForPlaystoreUpdate() {
        // F-Droid must remain Firebase-free and independently signed; its updater is F-Droid.
        if (!"playstore".equals(BuildConfig.DISTRIBUTION_CHANNEL)) {
            return;
        }

        updateExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(RELEASE_API_URL);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("User-Agent", "BlueNote-Android");
                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    return;
                }

                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        body.append(line);
                    }
                }

                JSONObject release = new JSONObject(body.toString());
                String tag = release.optString("tag_name", "");
                if (!tag.startsWith("v")) {
                    return;
                }

                String latestVersion = tag.substring(1);
                String currentVersion = BuildConfig.VERSION_NAME;
                if (!isNewerVersion(latestVersion, currentVersion)) {
                    return;
                }

                runOnUiThread(() -> showUpdateDialog(latestVersion));
            } catch (Exception ignored) {
                // Update checks are best-effort and must never interfere with app startup.
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    private boolean isNewerVersion(String latest, String current) {
        try {
            String[] a = latest.split("\\.");
            String[] b = current.split("\\.");
            int length = Math.max(a.length, b.length);
            for (int i = 0; i < length; i++) {
                int av = i < a.length ? Integer.parseInt(a[i].replaceAll("[^0-9].*$", "")) : 0;
                int bv = i < b.length ? Integer.parseInt(b[i].replaceAll("[^0-9].*$", "")) : 0;
                if (av != bv) {
                    return av > bv;
                }
            }
        } catch (Exception ignored) {
            return !latest.equals(current);
        }
        return false;
    }

    private void showUpdateDialog(String latestVersion) {
        if (isFinishing() || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 && isDestroyed())) {
            return;
        }

        new AlertDialog.Builder(this)
                .setTitle("BlueNote update available")
                .setMessage("BlueNote " + latestVersion + " is available. Download the signed Firebase-login APK?")
                .setNegativeButton("Later", null)
                .setPositiveButton("Download update", (dialog, which) -> {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(PLAYSTORE_APK_URL));
                        startActivity(intent);
                    } catch (Exception ignored) {
                    }
                })
                .show();
    }

    @Override
    protected void onDestroy() {
        updateExecutor.shutdownNow();
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
