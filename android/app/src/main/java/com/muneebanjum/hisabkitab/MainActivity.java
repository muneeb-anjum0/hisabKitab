package com.muneebanjum.hisabkitab;

import android.os.Bundle;
import android.content.pm.ApplicationInfo;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);
        WebSettings settings = webView.getSettings();
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setSaveFormData(false);
        webView.setOnLongClickListener(view -> {
            int type = webView.getHitTestResult().getType();
            return type == WebView.HitTestResult.ANCHOR_TYPE
                || type == WebView.HitTestResult.SRC_ANCHOR_TYPE
                || type == WebView.HitTestResult.IMAGE_TYPE
                || type == WebView.HitTestResult.IMAGE_ANCHOR_TYPE;
        });
    }
}
