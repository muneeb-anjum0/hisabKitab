package com.muneebanjum.hisabkitab;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setOnLongClickListener(view -> {
            int type = webView.getHitTestResult().getType();
            return type == WebView.HitTestResult.ANCHOR_TYPE
                || type == WebView.HitTestResult.SRC_ANCHOR_TYPE
                || type == WebView.HitTestResult.IMAGE_TYPE
                || type == WebView.HitTestResult.IMAGE_ANCHOR_TYPE;
        });
    }
}
