/**
 * ==========================================================================
 * نظام إدارة التوصيل المصغر (Mini Delivery Management System)
 * منسق التطبيق العام وإدارة العرض والتنقل (Main Application Coordinator)
 * ==========================================================================
 */

class AppCoordinator {
    constructor() {
        this.currentView = null;
        this.toastContainer = null;
        this.init();
    }

    init() {
        console.log("بدء تشغيل تطبيق نظام التوصيل المصغر...");
        this.toastContainer = document.getElementById("toast-container");
        this.setupGlobalEvents();
        this.updateDatabaseStatusIndicator();

        // مراقبة حالة جلسة المستخدم
        window.MDS_AUTH.onAuthStateChange((user, errorMsg) => {
            if (errorMsg) {
                this.showToast("تنبيه", errorMsg, "warning");
            }
            this.handleAuthStateChange(user);
        });
    }

    // إعداد الأحداث العامة على مستوى التطبيق
    setupGlobalEvents() {
        // نموذج تسجيل الدخول
        const loginForm = document.getElementById("login-form");
        if (loginForm) {
            loginForm.addEventListener("submit", (e) => this.handleLoginSubmit(e));
        }

        // أزرار الحسابات التجريبية السريعة
        const demoAdminBtn = document.getElementById("demo-admin-btn");
        if (demoAdminBtn) {
            demoAdminBtn.addEventListener("click", () => this.autofillDemoLogin("admin@delivery.ly", "123456"));
        }

        const demoCustomerBtn = document.getElementById("demo-customer-btn");
        if (demoCustomerBtn) {
            demoCustomerBtn.addEventListener("click", () => this.autofillDemoLogin("store@delivery.ly", "123456"));
        }

        const demoDriverBtn = document.getElementById("demo-driver-btn");
        if (demoDriverBtn) {
            demoDriverBtn.addEventListener("click", () => this.autofillDemoLogin("driver@delivery.ly", "123456"));
        }

        // أزرار تسجيل الخروج
        document.querySelectorAll(".action-logout").forEach(btn => {
            btn.addEventListener("click", () => this.handleLogout());
        });

        // زر فتح وإغلاق القائمة الجانبية للشاشات الصغيرة
        const sidebarToggle = document.getElementById("sidebar-toggle-btn");
        if (sidebarToggle) {
            sidebarToggle.addEventListener("click", () => this.toggleSidebar());
        }

        const sidebarBackdrop = document.getElementById("sidebar-backdrop");
        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener("click", () => this.closeSidebar());
        }

        // إغلاق النوافذ المنبثقة
        const modalCloseBtn = document.getElementById("modal-close-btn");
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener("click", () => this.closeModal());
        }

        const modalBackdrop = document.getElementById("app-modal");
        if (modalBackdrop) {
            modalBackdrop.addEventListener("click", (e) => {
                if (e.target === modalBackdrop) this.closeModal();
            });
        }

        // أزرار التنقل الجانبي (Sidebar Nav Links)
        document.querySelectorAll(".nav-link[data-view]").forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const viewTarget = link.getAttribute("data-view");
                this.switchView(viewTarget);
                this.closeSidebar();
            });
        });
    }

    // مؤشر حالة الاتصال بقاعدة بيانات Firebase
    updateDatabaseStatusIndicator() {
        const dot = document.getElementById("db-status-dot");
        const label = document.getElementById("db-status-label");
        if (!dot || !label) return;

        if (window.MDS_CONFIG && window.MDS_CONFIG.isRealFirebase) {
            dot.className = "db-status-dot connected";
            label.textContent = "Firebase متصل";
        } else {
            dot.className = "db-status-dot demo";
            label.textContent = "وضع تجريبي / محلي";
        }
    }

    // معالجة تسجيل الدخول
    async handleLoginSubmit(e) {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        const submitBtn = document.getElementById("login-submit-btn");

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span class="spinner"></span> جاري التحقق...`;
            }

            await window.MDS_AUTH.login(email, password);
            this.showToast("مرحباً بك", "تم تسجيل الدخول بنجاح وتحديد صلاحيات الحساب.", "success");
        } catch (error) {
            console.error("Login error:", error);
            this.showToast("خطأ في تسجيل الدخول", error.message || "تعذر إتمام الدخول.", "danger");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `تسجيل الدخول <i class="fa-solid fa-arrow-left"></i>`;
            }
        }
    }

    // الملء التلقائي للحسابات التجريبية
    autofillDemoLogin(email, password) {
        const emailInput = document.getElementById("login-email");
        const passInput = document.getElementById("login-password");
        if (emailInput) emailInput.value = email;
        if (passInput) passInput.value = password;
        this.showToast("تم التعبئة", `تم ملء بيانات الحساب التجريبي (${email}). اضغط تسجيل الدخول للمتابعة.`, "info");
    }

    // معالجة تسجيل الخروج
    async handleLogout() {
        if (!confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟")) return;

        try {
            this.showLoading(true);
            await window.MDS_AUTH.logout();
            this.showToast("تم تسجيل الخروج", "تم إنهاء الجلسة بنجاح.", "info");
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            this.showLoading(false);
        }
    }

    // التبديل بين صفحة الدخول ولوحات التحكم بحسب الدور
    handleAuthStateChange(user) {
        const authSection = document.getElementById("auth-section");
        const dashboardSection = document.getElementById("dashboard-section");

        if (!user) {
            this.activeUserUid = null;
            this.activeUserRole = null;

            // غير مسجل: إظهار صفحة تسجيل الدخول وإخفاء لوحة التحكم
            if (authSection) authSection.classList.remove("d-none");
            if (dashboardSection) dashboardSection.classList.add("d-none");

            // تدمير اشتراكات الوحدات السابقة لمنع التكرار
            if (window.adminCtrl) window.adminCtrl.destroy();
            if (window.custCtrl) window.custCtrl.destroy();
            if (window.driverCtrl) window.driverCtrl.destroy();
            return;
        }

        // مسجل: إخفاء تسجيل الدخول وإظهار لوحة التحكم
        if (authSection) authSection.classList.add("d-none");
        if (dashboardSection) dashboardSection.classList.remove("d-none");

        // تعبئة معلومات المستخدم في القائمة الجانبية والترويسة
        this.updateUserInterfaceInfo(user);

        // منع إعادة التهيئة المتكررة إذا كان المستخدم الحالي مهيأ ومفعّل مسبقاً
        if (this.activeUserUid === user.uid && this.activeUserRole === user.role) {
            console.log("المستخدم نشط بالفعل بنفس الجلسة، تم تجاوز إعادة التهيئة المتكررة.");
            return;
        }

        // تدمير أي اشتراكات سابقة قبل إطلاق الوحدة الجديدة
        if (window.adminCtrl) window.adminCtrl.destroy();
        if (window.custCtrl) window.custCtrl.destroy();
        if (window.driverCtrl) window.driverCtrl.destroy();

        this.activeUserUid = user.uid;
        this.activeUserRole = user.role;

        // تخصيص القائمة الجانبية وإطلاق وحدة التحكم بحسب الدور
        this.setupRoleDashboard(user);
    }

    // تحديث بيانات المستخدم في واجهة لوحة التحكم
    updateUserInterfaceInfo(user) {
        const nameEl = document.getElementById("sidebar-user-name");
        const roleEl = document.getElementById("sidebar-user-role");
        const avatarEl = document.getElementById("sidebar-user-avatar");

        const displayName = user.storeName || user.name || user.email;
        if (nameEl) nameEl.textContent = displayName;

        let roleText = "مدير النظام";
        let avatarLetter = "م";
        if (user.role === "customer") {
            roleText = "زبون / متجر";
            avatarLetter = "ت";
        } else if (user.role === "driver") {
            roleText = "مندوب توصيل";
            avatarLetter = "س";
        }

        if (roleEl) roleEl.textContent = roleText;
        if (avatarEl) avatarEl.textContent = avatarLetter;
    }

    // إعداد لوحة التحكم وعناصر القائمة بحسب الصلاحية
    setupRoleDashboard(user) {
        // إخفاء كافة مجموعات القوائم الجانبية
        document.querySelectorAll(".role-nav-group").forEach(el => el.classList.add("d-none"));

        if (user.role === "admin") {
            // إظهار روابط المسؤول
            const adminNav = document.getElementById("admin-nav-group");
            if (adminNav) adminNav.classList.remove("d-none");
            // تهيئة وحدة المسؤول
            window.adminCtrl.init();
            this.switchView("admin-overview");

        } else if (user.role === "customer") {
            // إظهار روابط الزبون
            const custNav = document.getElementById("customer-nav-group");
            if (custNav) custNav.classList.remove("d-none");
            // تهيئة وحدة الزبون
            window.custCtrl.init();
            this.switchView("customer-shipments");

        } else if (user.role === "driver") {
            // إظهار روابط المندوب
            const driverNav = document.getElementById("driver-nav-group");
            if (driverNav) driverNav.classList.remove("d-none");
            // تهيئة وحدة المندوب
            window.driverCtrl.init();
            this.switchView("driver-trips");
        }
    }

    // التبديل بين شاشات لوحة التحكم (Views) مع التحقق الأمني
    switchView(viewId) {
        const currentUser = window.MDS_AUTH.getCurrentUser();
        if (!currentUser) return;

        // التحقق الأمني: منع وصول المستخدم لشاشات تخص أدواراً أخرى
        if (viewId.startsWith("admin-") && currentUser.role !== "admin") {
            this.showToast("وصول محظور", "ليس لديك صلاحية الوصول إلى شاشات الإدارة.", "danger");
            return;
        }
        if (viewId.startsWith("customer-") && currentUser.role !== "customer") {
            this.showToast("وصول محظور", "هذه الشاشة مخصصة للزبائن والمتاجر فقط.", "danger");
            return;
        }
        if (viewId.startsWith("driver-") && currentUser.role !== "driver") {
            this.showToast("وصول محظور", "هذه الشاشة مخصصة لمناديب التوصيل فقط.", "danger");
            return;
        }

        // إخفاء كافة الشاشات
        document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));

        // إظهار الشاشة المطلوبة
        const targetSection = document.getElementById(`view-${viewId}`);
        if (targetSection) {
            targetSection.classList.add("active");
            this.currentView = viewId;
        }

        // تحديث الرابط النشط في القائمة الجانبية
        document.querySelectorAll(".nav-link").forEach(link => {
            if (link.getAttribute("data-view") === viewId) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        // تحديث عنوان الترويسة والمسار
        this.updateHeaderBreadcrumb(viewId);
    }

    updateHeaderBreadcrumb(viewId) {
        const titleEl = document.getElementById("header-page-title");
        const crumbEl = document.getElementById("header-page-crumb");
        if (!titleEl || !crumbEl) return;

        const viewTitles = {
            "admin-overview": { title: "نظرة عامة وإحصائيات النظام", crumb: "لوحة المسؤول / الإحصائيات" },
            "admin-shipments": { title: "إدارة ومراقبة كافة الشحنات", crumb: "لوحة المسؤول / الشحنات" },
            "admin-trips": { title: "تنظيم وإدارة رحلات التوصيل", crumb: "لوحة المسؤول / الرحلات" },
            "admin-settlements": { title: "التسويات المالية والتوريد النقدي", crumb: "لوحة المسؤول / التسويات" },
            "admin-customers": { title: "إدارة حسابات الزبائن والمتاجر", crumb: "لوحة المسؤول / الزبائن" },
            "admin-drivers": { title: "إدارة مناديب التوصيل والسائقين", crumb: "لوحة المسؤول / المناديب" },
            "admin-cities": { title: "إدارة المدن وأسعار التوصيل", crumb: "لوحة المسؤول / المدن والأسعار" },
            "admin-withdrawals": { title: "طلبات سحب الأرصدة المالية", crumb: "لوحة المسؤول / طلبات السحب" },

            "customer-shipments": { title: "شحنات المتجر ومتابعة الحالات", crumb: "لوحة المتجر / الشحنات" },
            "customer-new-shipment": { title: "إنشاء شحنة توصيل جديدة", crumb: "لوحة المتجر / شحنة جديدة" },
            "customer-finances": { title: "المحفظة المالية وطلبات السحب", crumb: "لوحة المتجر / المالية" },

            "driver-trips": { title: "رحلات التوصيل والشحنات المكلف بها", crumb: "لوحة المندوب / رحلاتي" }
        };

        const info = viewTitles[viewId] || { title: "لوحة التحكم", crumb: "الرئيسية" };
        titleEl.textContent = info.title;
        crumbEl.textContent = info.crumb;
    }

    // ======================================================================
    // النوافذ المنبثقة والإشعارات (Modals & Toast System)
    // ======================================================================
    openModal(title, bodyHtml) {
        const modal = document.getElementById("app-modal");
        const modalTitle = document.getElementById("modal-title-text");
        const modalBody = document.getElementById("modal-body-container");

        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = bodyHtml;

        if (modal) {
            modal.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    }

    closeModal() {
        const modal = document.getElementById("app-modal");
        if (modal) {
            modal.classList.remove("active");
            document.body.style.overflow = "";
        }
    }

    showToast(title, message, type = "info") {
        if (!this.toastContainer) return;

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;

        let iconClass = "fa-circle-info";
        if (type === "success") iconClass = "fa-circle-check";
        else if (type === "danger") iconClass = "fa-circle-exclamation";
        else if (type === "warning") iconClass = "fa-triangle-exclamation";

        toast.innerHTML = `
            <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(-30px)";
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    showLoading(isLoading) {
        const loader = document.getElementById("app-loading-overlay");
        if (loader) {
            if (isLoading) loader.classList.remove("d-none");
            else loader.classList.add("d-none");
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector(".dashboard-sidebar");
        const backdrop = document.getElementById("sidebar-backdrop");
        if (sidebar) sidebar.classList.toggle("sidebar-open");
        if (backdrop) backdrop.classList.toggle("active");
    }

    closeSidebar() {
        const sidebar = document.querySelector(".dashboard-sidebar");
        const backdrop = document.getElementById("sidebar-backdrop");
        if (sidebar) sidebar.classList.remove("sidebar-open");
        if (backdrop) backdrop.classList.remove("active");
    }

    // نافذة إعدادات Firebase والبيانات الأولية
    openFirebaseConfigModal() {
        const currentConfig = window.MDS_CONFIG.firebaseConfig;
        const configJsonStr = JSON.stringify(currentConfig, null, 2);

        const modalBody = `
            <div class="mb-3">
                <p class="text-secondary" style="font-size:0.9rem;">
                    يمكنك ربط التطبيق بمشروعك في <strong>Firebase Console</strong> عن طريق لصق كائن الإعدادات <code>firebaseConfig</code> أدناه أو تعديل ملف <code>JS/firebase-config.js</code>.
                </p>
                <div class="form-group">
                    <label class="form-label">إعدادات Firebase (JSON Format):</label>
                    <textarea id="firebase-config-input" class="form-control" rows="8" style="direction:ltr; font-family:monospace; font-size:0.85rem;">${configJsonStr}</textarea>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <button type="button" class="btn btn-sm btn-outline-gold" onclick="window.MDS_CONFIG.resetConfigToDefault()">
                        <i class="fa-solid fa-rotate-left"></i> استعادة الإعدادات الافتراضية
                    </button>
                    <button type="button" class="btn btn-gold" onclick="window.MDS_APP.saveCustomFirebaseConfig()">
                        <i class="fa-solid fa-floppy-disk"></i> حفظ الإعدادات وإعادة التحميل
                    </button>
                </div>

                <div class="mt-4 pt-3 border-top">
                    <h5 class="text-primary mb-2"><i class="fa-solid fa-database text-gold"></i> تهيئة البيانات الأولية (Seeding)</h5>
                    <p class="text-muted" style="font-size:0.85rem;">
                        يقوم هذا الخيار بتهيئة المدن الأربعة الافتراضية (بنغازي 30، مصراتة 20، ترهونة 25، البيضاء 35) والحسابات التجريبية في قاعدة البيانات.
                    </p>
                    <button type="button" class="btn btn-sm btn-primary" onclick="window.MDS_APP.triggerSeedData()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> تهيئة البيانات في Firebase الآن
                    </button>
                </div>
            </div>
        `;

        this.openModal("إعدادات الاتصال بقاعدة بيانات Firebase", modalBody);
    }

    saveCustomFirebaseConfig() {
        const input = document.getElementById("firebase-config-input");
        if (!input) return;

        try {
            const parsed = JSON.parse(input.value);
            if (!parsed.apiKey || !parsed.databaseURL) {
                throw new Error("يجب أن يحتوي الكائن على apiKey و databaseURL على الأقل.");
            }
            window.MDS_CONFIG.saveCustomConfig(parsed);
        } catch (e) {
            this.showToast("خطأ في البيانات", "تنسيق JSON غير صالح: " + e.message, "danger");
        }
    }

    async triggerSeedData() {
        if (!confirm("هل ترغب في تهيئة المدن الأربعة والبيانات الأولية في قاعدة البيانات؟")) return;

        try {
            this.showLoading(true);
            await window.MDS_DB.resetToDefaultSeed();
            this.closeModal();
            this.showToast("تمت التهيئة بنجاح", "تمت تهيئة المدن والحسابات الأولية بنجاح.", "success");
            window.location.reload();
        } catch (e) {
            this.showToast("خطأ", e.message, "danger");
        } finally {
            this.showLoading(false);
        }
    }
}

// إنشاء المنسق العام بعد اكتمال تحميل المستند
document.addEventListener("DOMContentLoaded", () => {
    window.MDS_APP = new AppCoordinator();
});
