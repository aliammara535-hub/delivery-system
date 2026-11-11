/**
 * ==========================================================================
 * نظام إدارة التوصيل المصغر (Mini Delivery Management System)
 * ملف إعدادات وتهيئة Firebase (Firebase Configuration & Initialization)
 * ==========================================================================
 */

// إعدادات مشروع Firebase الخاصة بك
// يرجى استبدال القيم أدناه ببيانات مشروعك من Firebase Console -> Project Settings -> General -> Your apps
const defaultFirebaseConfig = {
    apiKey: "AIzaSyAr4DL5bLyv9Lo-nz4q9XM3fvD02xAszYE",
    authDomain: "delivery-system-bce49.firebaseapp.com",
    databaseURL: "https://delivery-system-bce49-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "delivery-system-bce49",
    storageBucket: "delivery-system-bce49.firebasestorage.app",
    messagingSenderId: "80516438271",
    appId: "1:80516438271:web:e7c2807e9dd2130c7c14ca"
};

// فحص وجود إعدادات مخصصة محفوظة في المتصفح
const savedConfigStr = localStorage.getItem('MDS_FIREBASE_CONFIG');
let activeFirebaseConfig = defaultFirebaseConfig;

if (savedConfigStr) {
    try {
        const parsed = JSON.parse(savedConfigStr);
        if (parsed && parsed.apiKey && !parsed.apiKey.includes('YOUR_API_KEY')) {
            activeFirebaseConfig = parsed;
        }
    } catch (e) {
        console.warn("تعذر قراءة إعدادات Firebase المحفوظة:", e);
    }
}

// التحقق من صحة الإعدادات الحالية
function isRealFirebaseConfigured() {
    return activeFirebaseConfig &&
        activeFirebaseConfig.apiKey &&
        !activeFirebaseConfig.apiKey.includes('YOUR_API_KEY') &&
        activeFirebaseConfig.databaseURL &&
        !activeFirebaseConfig.databaseURL.includes('demo-default');
}

// المتغيرات العامة للخدمات
let fbApp = null;
let fbAuth = null;
let fbDatabase = null;
let isDemoMode = !isRealFirebaseConfigured();

// تهيئة Firebase
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            fbApp = firebase.initializeApp(activeFirebaseConfig);
        } else {
            fbApp = firebase.app();
        }
        fbAuth = firebase.auth();
        fbDatabase = firebase.database();
        console.log("تم تحميل مكتبات Firebase بنجاح.");
    } else {
        console.warn("مكتبة Firebase غير متوفرة في الصفحة.");
    }
} catch (error) {
    console.warn("تنبيه أثناء تهيئة Firebase:", error.message);
    isDemoMode = true;
}

// تصدير الكائنات والوظائف العامة إلى window
window.MDS_CONFIG = {
    firebaseConfig: activeFirebaseConfig,
    isRealFirebase: isRealFirebaseConfigured(),
    isDemoMode: isDemoMode,
    fbApp: fbApp,
    fbAuth: fbAuth,
    fbDatabase: fbDatabase,
    saveCustomConfig: function(newConfig) {
        if (newConfig && newConfig.apiKey) {
            localStorage.setItem('MDS_FIREBASE_CONFIG', JSON.stringify(newConfig));
            window.location.reload();
            return true;
        }
        return false;
    },
    resetConfigToDefault: function() {
        localStorage.removeItem('MDS_FIREBASE_CONFIG');
        window.location.reload();
    }
};
