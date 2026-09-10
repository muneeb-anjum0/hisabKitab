package com.muneebanjum.hisabkitab;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class AppIdentityTest {
    @Test
    public void applicationIdRemainsStable() {
        assertEquals("com.muneebanjum.hisabkitab", MainActivity.class.getPackage().getName());
    }
}
