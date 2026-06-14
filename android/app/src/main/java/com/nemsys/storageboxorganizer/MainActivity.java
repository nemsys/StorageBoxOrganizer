package com.nemsys.storageboxorganizer;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import androidx.annotation.RequiresApi;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Aggressive OEMs (notably ColorOS / OPPO) may reclaim the WebView's
        // renderer child process while the app is backgrounded — for example
        // while a system camera app or file picker is foregrounded. By default
        // the WebView responds to that by terminating the whole app, which
        // bounces the user back to the home screen and loses any in-progress
        // work. We override onRenderProcessGone so a renderer death is handled
        // gracefully instead: recreate the activity, which builds a fresh
        // WebView and reloads the web app. The in-page draft restore then
        // reopens whatever modal/form was open, so the kill becomes invisible.
        //
        // We keep Capacitor's own BridgeWebViewClient behaviour by extending it.
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            webView.setWebViewClient(new BridgeWebViewClient(this.getBridge()) {
                @RequiresApi(api = Build.VERSION_CODES.O)
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    boolean didCrash = detail != null && detail.didCrash();
                    Log.w(TAG, "WebView renderer gone (didCrash=" + didCrash
                            + "); recreating activity instead of letting the app die");
                    // The WebView tied to the dead renderer is unusable; recreate
                    // the activity on the UI thread to obtain a fresh one.
                    runOnUiThread(() -> {
                        try {
                            recreate();
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to recreate after renderer loss", e);
                        }
                    });
                    // Returning true tells the framework we handled it and the
                    // process should NOT be terminated.
                    return true;
                }
            });
        }
    }
}
