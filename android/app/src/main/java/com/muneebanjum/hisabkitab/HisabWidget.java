package com.muneebanjum.hisabkitab;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

abstract class HisabWidget extends AppWidgetProvider {
    abstract int layout();

    private PendingIntent action(Context context, String path, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("hisabkitab://" + path))
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), layout());
            views.setOnClickPendingIntent(R.id.widget_root, action(context, "open", id * 10));
            views.setOnClickPendingIntent(R.id.widget_expense, action(context, "add/expense", id * 10 + 1));
            views.setOnClickPendingIntent(R.id.widget_money, action(context, "add/remittance", id * 10 + 2));
            manager.updateAppWidget(id, views);
        }
    }
}
