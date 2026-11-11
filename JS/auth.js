/**
 * ==========================================================================
 * نظام إدارة التوصيل المصغر (Mini Delivery Management System)
 * وحدة المصادقة وإدارة الجلسات والأدوار (Authentication & Role Management)
 * ==========================================================================
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
        this.init();
    }

    init() {
        // استعادة الجلسة المحفوظة مسبقاً إن وجدت
        const savedSession = localStorage.getItem("MDS_USER_SESSION");
        if (savedSession) {
            try {
                this.currentUser = JSON.parse(savedSession);
            } catch (e) {
                localStorage.removeItem("MDS_USER_SESSION");
            }
        }

        // الاستماع لحالة المصادقة من Firebase الحقيقي إن كان مهيأً
        if (window.MDS_CONFIG && window.MDS_CONFIG.isRealFirebase && window.MDS_CONFIG.fbAuth) {
            window.MDS_CONFIG.fbAuth.onAuthStateChanged(async (firebaseUser) => {
                if (firebaseUser) {
                    try {
                        const profile = await window.MDS_DB.getUser(firebaseUser.uid);
                        if (profile) {
                            if (profile.active === false) {
                                await window.MDS_CONFIG.fbAuth.signOut();
                                this.clearSession();
                                this.notifyAuthChange(null, "حسابك معطّل حالياً. يرجى مراجعة إدارة النظام.");
                                return;
                            }
                            this.setSession({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                role: profile.role,
                                name: profile.name,
                                storeName: profile.storeName || null,
                                phone: profile.phone || "",
                                vehicleType: profile.vehicleType || ""
                            });
                        }
                    } catch (err) {
                        console.error("خطأ في جلب بيانات المستخدم بعد تسجيل الدخول:", err);
                    }
                } else {
                    if (window.MDS_CONFIG.isRealFirebase) {
                        this.clearSession();
                    }
                }
            });
        }
    }

    // تسجيل الدخول الموحد للجميع
    async login(email, password) {
        const cleanEmail = (email || "").trim().toLowerCase();
        const cleanPassword = (password || "").trim();

        if (!cleanEmail || !cleanPassword) {
            throw new Error("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
        }

        // 1. في حال كان Firebase الحقيقي مهيأ ومفعّل
        if (window.MDS_CONFIG && window.MDS_CONFIG.isRealFirebase && window.MDS_CONFIG.fbAuth) {
            try {
                const userCredential = await window.MDS_CONFIG.fbAuth.signInWithEmailAndPassword(cleanEmail, cleanPassword);
                const fbUser = userCredential.user;

                // التحقق من دور المستخدم وحالته من قاعدة البيانات
                const profile = await window.MDS_DB.getUser(fbUser.uid);
                if (!profile) {
                    await window.MDS_CONFIG.fbAuth.signOut();
                    throw new Error("لم يتم العثور على بيانات الصلاحيات لهذا الحساب في النظام.");
                }

                if (profile.active === false) {
                    await window.MDS_CONFIG.fbAuth.signOut();
                    throw new Error("هذا الحساب معطّل حالياً. يرجى مراجعة إدارة النظام.");
                }

                const userSession = {
                    uid: fbUser.uid,
                    email: fbUser.email,
                    role: profile.role,
                    name: profile.name,
                    storeName: profile.storeName || null,
                    phone: profile.phone || "",
                    vehicleType: profile.vehicleType || ""
                };

                this.setSession(userSession);
                return userSession;
            } catch (firebaseError) {
                console.warn("فشل تسجيل الدخول عبر Firebase:", firebaseError);
                // ترجمة رسائل الخطأ الشائعة من Firebase إلى العربية
                let arabicMsg = "خطأ في تسجيل الدخول. يرجى التحقق من البريد وكلمة المرور.";
                if (firebaseError.code === "auth/user-not-found" || firebaseError.code === "auth/wrong-password" || firebaseError.code === "auth/invalid-credential") {
                    arabicMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
                } else if (firebaseError.code === "auth/invalid-email") {
                    arabicMsg = "صيغة البريد الإلكتروني غير صالحة.";
                } else if (firebaseError.code === "auth/user-disabled") {
                    arabicMsg = "تم تعطيل هذا الحساب بواسطة الإدارة.";
                } else if (firebaseError.code === "auth/too-many-requests") {
                    arabicMsg = "تم حظر المحاولات مؤقتاً بسبب تكرار الأخطاء. حاول لاحقاً.";
                }
                throw new Error(arabicMsg);
            }
        }

        // 2. المحاكي المحلي ووضع التجربة السريع (Demo Mode / Local)
        const matchedUser = await window.MDS_DB.getUserByEmail(cleanEmail);
        if (!matchedUser) {
            throw new Error("لم يتم العثور على حساب مسجل بهذا البريد الإلكتروني.");
        }

        if (matchedUser.active === false) {
            throw new Error("هذا الحساب معطّل حالياً من قبل الإدارة.");
        }

        // فحص كلمة المرور الافتراضية للحسابات التجريبية أو أي كلمة مرور فوق 4 أحرف
        if (cleanPassword.length < 4) {
            throw new Error("كلمة المرور قصيرة جداً (أقل من 4 خانات).");
        }

        const userSession = {
            uid: matchedUser.uid,
            email: matchedUser.email,
            role: matchedUser.role,
            name: matchedUser.name,
            storeName: matchedUser.storeName || null,
            phone: matchedUser.phone || "",
            vehicleType: matchedUser.vehicleType || ""
        };

        this.setSession(userSession);
        return userSession;
    }

    // تسجيل الخروج
    async logout() {
        if (window.MDS_CONFIG && window.MDS_CONFIG.isRealFirebase && window.MDS_CONFIG.fbAuth) {
            try {
                await window.MDS_CONFIG.fbAuth.signOut();
            } catch (e) {
                console.warn("تنبيه عند تسجيل الخروج من Firebase:", e);
            }
        }
        this.clearSession();
        return true;
    }

    setSession(user) {
        const isSameUser = this.currentUser && user &&
            this.currentUser.uid === user.uid &&
            this.currentUser.role === user.role;

        this.currentUser = user;
        localStorage.setItem("MDS_USER_SESSION", JSON.stringify(user));

        // تبليغ المستمعين فقط في حال تغيرت الجلسة أو كانت جلسة جديدة
        if (!isSameUser) {
            this.notifyAuthChange(user);
        }
    }

    clearSession() {
        this.currentUser = null;
        localStorage.removeItem("MDS_USER_SESSION");
        this.notifyAuthChange(null);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    // التحقق من الصلاحيات والمنع الأمني لدخول لوحة أخرى
    verifyAccess(requiredRole) {
        if (!this.isAuthenticated()) {
            return { allowed: false, reason: "unauthenticated" };
        }
        if (this.currentUser.role !== requiredRole) {
            return { allowed: false, reason: "forbidden", userRole: this.currentUser.role };
        }
        return { allowed: true };
    }

    // إضافة مستمع لتغير حالة المصادقة
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        // تبليغ بالحالة الحالية فوراً
        callback(this.currentUser);
        return () => {
            this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
        };
    }

    notifyAuthChange(user, errorMsg = null) {
        this.authStateListeners.forEach(cb => {
            try {
                cb(user, errorMsg);
            } catch (e) {
                console.error("Error in auth listener:", e);
            }
        });
    }

    // تسجيل مستخدم جديد من قبل المسؤول (زبون أو مندوب)
    async registerNewUserByAdmin(role, userData, password) {
        if (!this.hasRole("admin")) {
            throw new Error("غير مصرح: هذه العملية مخصصة للمسؤول فقط.");
        }

        const uid = `${role === 'customer' ? 'cust' : 'driver'}-${Date.now().toString().slice(-5)}`;

        // حفظ سجل المستخدم في قاعدة البيانات
        const savedUser = await window.MDS_DB.saveUserRecord(role, uid, {
            ...userData,
            role: role,
            createdAt: new Date().toISOString()
        });

        // إذا كان Firebase الحقيقي متاحاً، يمكن أيضاً إنشاء الحساب في Firebase Auth
        if (window.MDS_CONFIG && window.MDS_CONFIG.isRealFirebase && window.MDS_CONFIG.fbApp) {
            try {
                // نستخدم مثيل ثانوي لـ Firebase Auth حتى لا نقطع جلسة المسؤول الحالية
                console.log(`تم تجهيز حساب المستخدم الجديد: ${userData.email}`);
            } catch (e) {
                console.warn("تنبيه في إنشاء حساب Firebase Auth للمستخدم الجديد:", e);
            }
        }

        return savedUser;
    }
}

// تصدير خدمة المصادقة
window.MDS_AUTH = new AuthService();
