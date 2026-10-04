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
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.annotation.RequiresApi;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_RESULT_CODE = 1001;
    private static final String APP_HOST = "lilsynnofficial.github.io";
    private static final String APP_PATH_PREFIX = "/public/";
    private static final String APP_ORIGIN = "https://" + APP_HOST;
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
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(APP_HOST)
                .addPathHandler(APP_PATH_PREFIX, new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setBackgroundColor(Color.parseColor("#FFFFFF"));

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            @RequiresApi(21)
            public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request
            ) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isTrustedAppUrl(uri)) {
                    return false;
                }
                openExternalUrl(uri);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (!isTrustedAppOrigin(request.getOrigin())) {
                    request.deny();
                    return;
                }

                final java.util.ArrayList<String> allowedResources = new java.util.ArrayList<>();
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                            || PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                        allowedResources.add(resource);
                    }
                }

                if (allowedResources.isEmpty()) {
                    request.deny();
                    return;
                }

                runOnUiThread(() -> request.grant(allowedResources.toArray(new String[0])));
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(
                    String origin,
                    GeolocationPermissions.Callback callback
            ) {
                if (isTrustedAppOrigin(Uri.parse(origin))) {
                    callback.invoke(origin, false, false);
                } else {
                    callback.invoke(origin, false, false);
                }
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
            webView.loadUrl(APP_ORIGIN + APP_PATH_PREFIX + "index.html");
            checkForPlaystoreUpdate();
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private boolean isTrustedAppOrigin(Uri uri) {
        return uri != null
                && "https".equalsIgnoreCase(uri.getScheme())
                && APP_HOST.equalsIgnoreCase(uri.getHost());
    }

    private boolean isTrustedAppUrl(Uri uri) {
        return isTrustedAppOrigin(uri)
                && uri.getPath() != null
                && uri.getPath().startsWith(APP_PATH_PREFIX);
    }

    private void openExternalUrl(Uri uri) {
        if (uri == null || uri.getScheme() == null) {
            return;
        }
        String scheme = uri.getScheme().toLowerCase();
        if (!"https".equals(scheme) && !"http".equals(scheme) && !"mailto".equals(scheme)
                && !"tel".equals(scheme)) {
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
        }
    }

    private void checkForPlaystoreUpdate() {
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
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
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
