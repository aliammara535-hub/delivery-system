/**
 * ==========================================================================
 * نظام إدارة التوصيل المصغر (Mini Delivery Management System)
 * وحدة تحكم الزبون / المتجر (Customer / Store Dashboard Controller)
 * ==========================================================================
 */

class CustomerController {
    constructor() {
        this.myShipments = [];
        this.myWithdrawals = [];
        this.cities = {};
        this.currentStatusFilter = "all";
        this.searchQuery = "";
        this.availableBalance = 0;
        this.unsubscribers = [];
        this.eventsBound = false;
        this.isSubmitting = false;
    }

    async init() {
        console.log("تهيئة لوحة تحكم الزبون/المتجر...");
        // إلغاء أي اشتراكات سابقة لمنع التكرار
        this.destroy();

        // ربط الأحداث مرة واحدة فقط
        if (!this.eventsBound) {
            this.setupEventListeners();
            this.eventsBound = true;
        }

        await this.loadInitialData();
        this.subscribeRealtimeUpdates();
    }

    destroy() {
        if (this.unsubscribers && this.unsubscribers.length > 0) {
            this.unsubscribers.forEach(unsub => {
                if (typeof unsub === "function") {
                    try { unsub(); } catch (e) { console.warn("Error unsubscribing:", e); }
                }
            });
        }
        this.unsubscribers = [];
    }

    setupEventListeners() {
        // الاستماع لتغيير المدينة في نموذج إضافة شحنة لتحديث السعر تلقائياً
        const citySelect = document.getElementById("cust-shipment-city");
        if (citySelect) {
            citySelect.addEventListener("change", (e) => {
                this.updateDeliveryPricePreview(e.target.value);
            });
        }

        // نموذج إنشاء شحنة جديدة
        const form = document.getElementById("create-shipment-form");
        if (form) {
            form.addEventListener("submit", (e) => this.handleCreateShipment(e));
        }

        // البحث في الشحنات
        const searchInput = document.getElementById("cust-shipment-search");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderShipmentsCards();
            });
        }

        // تبويبات الحالات
        const statusTabs = document.querySelectorAll(".cust-status-tab");
        statusTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                statusTabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                this.currentStatusFilter = tab.getAttribute("data-status");
                this.renderShipmentsCards();
            });
        });
    }

    // جلب البيانات الأولية الخاصة بالزبون الحالي فقط
    async loadInitialData() {
        const currentUser = window.MDS_AUTH.getCurrentUser();
        if (!currentUser) return;

        try {
            // جلب المدن والأسعار ديناميكياً من Firebase
            this.cities = await window.MDS_DB.getCities();
            this.populateCitiesDropdown();

            // جلب شحنات الزبون الحالي فقط
            this.myShipments = await window.MDS_DB.getCustomerShipments(currentUser.uid);
            this.myWithdrawals = await window.MDS_DB.getCustomerWithdrawals(currentUser.uid);
            this.availableBalance = await window.MDS_DB.getCustomerBalance(currentUser.uid);

            this.renderAllViews();
        } catch (error) {
            console.error("خطأ في تحميل بيانات الزبون:", error);
            window.MDS_APP.showToast("خطأ", "تعذر جلب بيانات الشحنات.", "danger");
        }
    }

    // الاشتراك في التحديثات اللحظية المباشرة
    subscribeRealtimeUpdates() {
        const currentUser = window.MDS_AUTH.getCurrentUser();
        if (!currentUser) return;

        // الاستماع لتغيرات الشحنات وتصفيتها للزبون الحالي
        const unsubShipments = window.MDS_DB.on("shipments", async (data) => {
            if (data) {
                const all = Object.values(data);
                this.myShipments = all.filter(s => s.customerId === currentUser.uid);
            } else {
                this.myShipments = [];
            }
            this.availableBalance = await window.MDS_DB.getCustomerBalance(currentUser.uid);
            this.renderAllViews();
        });
        this.unsubscribers.push(unsubShipments);

        // الاستماع للمدن وتحديث القائمة المنسدلة عند تغيير الأسعار من قبل الإدارة
        const unsubCities = window.MDS_DB.on("cities", (data) => {
            if (data) {
                this.cities = data;
                this.populateCitiesDropdown();
                const citySelect = document.getElementById("cust-shipment-city");
                if (citySelect && citySelect.value) {
                    this.updateDeliveryPricePreview(citySelect.value);
                }
            }
        });
        this.unsubscribers.push(unsubCities);

        // الاستماع لطلبات السحب
        const unsubWithdrawals = window.MDS_DB.on("withdrawalRequests", (data) => {
            if (data) {
                const all = Object.values(data);
                this.myWithdrawals = all.filter(w => w.customerId === currentUser.uid);
                this.renderTransactionsTable();
            }
        });
        this.unsubscribers.push(unsubWithdrawals);
    }

    // ملء قائمة المدن ديناميكياً من قاعدة البيانات
    populateCitiesDropdown() {
        const select = document.getElementById("cust-shipment-city");
        if (!select) return;

        const currentVal = select.value;
        let html = '<option value="">-- اختر مدينة وجهة التوصيل --</option>';

        Object.values(this.cities).forEach(c => {
            if (c.active !== false) {
                html += `<option value="${c.key}">${c.nameAr} (${c.price} د.ل)</option>`;
            }
        });

        select.innerHTML = html;
        if (currentVal && this.cities[currentVal]) {
            select.value = currentVal;
            this.updateDeliveryPricePreview(currentVal);
        }
    }

    // تحديث معاينة السعر تلقائياً عند تغيير المدينة المختارة
    updateDeliveryPricePreview(cityKey) {
        const previewEl = document.getElementById("cust-price-preview-val");
        const cityObj = this.cities[cityKey];

        if (cityObj && cityObj.price !== undefined) {
            if (previewEl) previewEl.textContent = Number(cityObj.price);
        } else {
            if (previewEl) previewEl.textContent = "0";
        }
    }

    // رسم كافة واجهات الزبون
    renderAllViews() {
        this.renderStats();
        this.renderShipmentsCards();
        this.renderTransactionsTable();
    }

    // ======================================================================
    // 1. إحصائيات الزبون والمحفظة المالية
    // ======================================================================
    renderStats() {
        const total = this.myShipments.length;
        const pending = this.myShipments.filter(s => s.status === "بانتظار الموافقة").length;
        const delivering = this.myShipments.filter(s => s.status === "قيد التوصيل").length;
        const delivered = this.myShipments.filter(s => s.status === "تم التسليم").length;
        const settled = this.myShipments.filter(s => s.status === "تسوية مالية جاهزة").length;

        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setEl("cust-stat-total", total);
        setEl("cust-stat-pending", pending);
        setEl("cust-stat-delivering", delivering);
        setEl("cust-stat-delivered", delivered);
        setEl("cust-stat-settled", settled);
        setEl("cust-wallet-balance", this.availableBalance.toLocaleString('en-US'));

        // أرقام التبويبات
        setEl("cust-tab-count-all", total);
        setEl("cust-tab-count-pending", pending);
        setEl("cust-tab-count-delivering", delivering);
        setEl("cust-tab-count-delivered", delivered);
        setEl("cust-tab-count-settled", settled);
    }

    // ======================================================================
    // 2. إنشاء شحنة جديدة والتحقق منها
    // ======================================================================
    async handleCreateShipment(e) {
        e.preventDefault();

        // منع الإرسال المتعدد المتكرر (Debounce/Lock)
        if (this.isSubmitting) {
            console.warn("جاري معالجة طلب إضافة شحنة بالفعل...");
            return;
        }

        const currentUser = window.MDS_AUTH.getCurrentUser();
        if (!currentUser) return;

        const recipientName = document.getElementById("cust-recipient-name").value.trim();
        const recipientPhone = document.getElementById("cust-recipient-phone").value.trim();
        const cityKey = document.getElementById("cust-shipment-city").value;
        const details = document.getElementById("cust-shipment-details").value.trim();
        const itemValue = Number(document.getElementById("cust-item-value").value) || 0;

        const cityObj = this.cities[cityKey];
        if (!cityObj) {
            window.MDS_APP.showToast("خطأ", "يرجى اختيار مدينة صحيحة.", "danger");
            return;
        }

        const shipmentData = {
            recipientName: recipientName,
            recipientPhone: recipientPhone,
            cityKey: cityKey,
            cityName: cityObj.nameAr,
            details: details,
            itemValue: itemValue
        };

        // التحقق من صحة المدخلات
        const validation = window.MDS_SHIPMENTS.validateNewShipmentData(shipmentData);
        if (!validation.valid) {
            window.MDS_APP.showToast("خطأ في البيانات", validation.errors.join("<br>"), "danger");
            return;
        }

        const submitBtn = document.querySelector("#create-shipment-form button[type='submit']");

        try {
            this.isSubmitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span class="spinner"></span> جاري الحفظ...`;
            }
            window.MDS_APP.showLoading(true);

            const created = await window.MDS_DB.createShipment(shipmentData, currentUser);

            // تصفير النموذج
            document.getElementById("create-shipment-form").reset();
            this.updateDeliveryPricePreview("");

            window.MDS_APP.showToast("تم إنشاء الشحنة", `تم تسجيل الشحنة برقم #${created.id} بنجاح وهي الآن بحالة "بانتظار الموافقة".`, "success");

            // التبديل إلى تبويب الشحنات
            window.MDS_APP.switchView("customer-shipments");
        } catch (error) {
            console.error("خطأ في إنشاء الشحنة:", error);
            window.MDS_APP.showToast("فشل الحفظ", error.message || "حدث خطأ أثناء حفظ الشحنة في قاعدة البيانات.", "danger");
        } finally {
            this.isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> تأكيد وحفظ الشحنة`;
            }
            window.MDS_APP.showLoading(false);
        }
    }

    // ======================================================================
    // 3. عرض بطاقات الشحنات للزبون (Shipment Cards)
    // ======================================================================
    getFilteredShipments() {
        return this.myShipments.filter(s => {
            // تصفية الحالة
            if (this.currentStatusFilter !== "all" && s.status !== this.currentStatusFilter) {
                return false;
            }
            // البحث
            if (this.searchQuery) {
                const q = this.searchQuery;
                const matchId = (s.id || "").toLowerCase().includes(q);
                const matchRecipient = (s.recipientName || "").toLowerCase().includes(q);
                const matchPhone = (s.recipientPhone || "").toLowerCase().includes(q);
                if (!matchId && !matchRecipient && !matchPhone) return false;
            }
            return true;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderShipmentsCards() {
        const grid = document.getElementById("cust-shipments-grid");
        if (!grid) return;

        const filtered = this.getFilteredShipments();

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5" style="grid-column: 1 / -1;">
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-box"></i></div>
                        <h4 class="empty-state-title">لا توجد شحنات مطابقة للعرض</h4>
                        <p class="empty-state-desc">يمكنك إضافة شحنة جديدة بسهولة عبر نموذج إنشاء شحنة.</p>
                        <button class="btn btn-primary" onclick="window.MDS_APP.switchView('customer-new-shipment')">
                            <i class="fa-solid fa-plus"></i> إنشاء شحنة جديدة الآن
                        </button>
                    </div>
                </div>`;
            return;
        }

        grid.innerHTML = filtered.map(s => {
            const dateStr = new Date(s.createdAt).toLocaleDateString('ar-LY', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return `
                <div class="customer-shipment-card">
                    <div>
                        <div class="shipment-card-top">
                            <span class="shipment-code"><i class="fa-solid fa-barcode"></i> #${s.id}</span>
                            ${window.MDS_SHIPMENTS.getStatusBadge(s.status)}
                        </div>

                        <div class="shipment-card-details">
                            <div class="shipment-detail-row">
                                <i class="fa-solid fa-user"></i>
                                <span>المستلم: <span class="shipment-detail-value">${s.recipientName}</span></span>
                            </div>
                            <div class="shipment-detail-row">
                                <i class="fa-solid fa-phone"></i>
                                <span>الهاتف: <span class="shipment-detail-value">${s.recipientPhone}</span></span>
                            </div>
                            <div class="shipment-detail-row">
                                <i class="fa-solid fa-location-dot"></i>
                                <span>المدينة: <span class="shipment-detail-value">${s.cityName}</span></span>
                            </div>

                            <div class="shipment-desc-box mt-2">
                                <i class="fa-solid fa-align-right text-gold"></i> ${s.details}
                            </div>

                            ${s.itemValue ? `
                            <div class="p-2 rounded mt-2 text-center" style="background:#FCF9EE; border:1px solid #E8D196; font-size:0.9rem;">
                                قيمة البضاعة المطلوب تحصيلها: <strong class="text-gold" style="font-size:1.05rem;">${s.itemValue} د.ل</strong>
                            </div>` : ''}
                        </div>
                    </div>

                    <div class="shipment-card-bottom">
                        <div>
                            <span class="text-muted"><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                            ${s.status === 'بانتظار الموافقة' ? `
                            <button class="btn btn-sm btn-outline text-danger ms-2" style="color:var(--color-danger); padding:2px 8px; font-size:0.75rem; margin-right:8px;" onclick="window.custCtrl.deleteShipment('${s.id}')" title="إلغاء وحذف الشحنة">
                                <i class="fa-solid fa-trash-can"></i> حذف
                            </button>` : ''}
                        </div>
                        <div class="shipment-price-tag">
                            <span>أجرة التوصيل:</span> ${s.price} <span>د.ل</span>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    // حذف الشحنة في حال كانت بانتظار الموافقة
    async deleteShipment(shipmentId) {
        if (!confirm(`هل أنت متأكد من رغبتك في حذف الشحنة #${shipmentId}؟`)) return;
        try {
            window.MDS_APP.showLoading(true);
            await window.MDS_DB.remove(`shipments/${shipmentId}`);
            window.MDS_APP.showToast("تم الحذف", `تم حذف الشحنة #${shipmentId} بنجاح.`, "info");
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }

    // ======================================================================
    // 4. العمليات المالية وطلب السحب (Wallet & Withdrawals)
    // ======================================================================
    renderTransactionsTable() {
        const tbody = document.getElementById("cust-withdrawals-table-body");
        if (!tbody) return;

        if (this.myWithdrawals.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">لا توجد طلبات سحب رصيد سابقة.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.myWithdrawals.sort((a,b) => new Date(b.requestDate) - new Date(a.requestDate)).map(w => {
            const dateStr = new Date(w.requestDate).toLocaleDateString('ar-LY', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            let statusBadge = `<span class="withdrawal-badge withdrawal-pending"><i class="fa-solid fa-clock"></i> قيد المراجعة</span>`;
            if (w.status === "approved") {
                statusBadge = `<span class="withdrawal-badge withdrawal-approved"><i class="fa-solid fa-check"></i> تم الصرف بنجاح</span>`;
            } else if (w.status === "rejected") {
                statusBadge = `<span class="withdrawal-badge withdrawal-rejected"><i class="fa-solid fa-xmark"></i> مرفوض</span>`;
            }

            return `
                <tr>
                    <td><strong class="text-gold">#${w.id}</strong></td>
                    <td><strong class="text-primary">${w.amount} د.ل</strong></td>
                    <td>${dateStr}</td>
                    <td>${statusBadge}</td>
                    <td><small class="text-muted">${w.adminNotes || w.notes || '-'}</small></td>
                </tr>
            `;
        }).join("");
    }

    // فتح نافذة طلب سحب رصيد
    openWithdrawalModal() {
        if (this.availableBalance <= 0) {
            window.MDS_APP.showToast("تنبيه", "ليس لديك رصيد متاح للسحب حالياً. يجب أن تكون لديك شحنات بحالة (تسوية مالية جاهزة).", "warning");
            return;
        }

        const modalBody = `
            <form onsubmit="window.custCtrl.submitWithdrawal(event)">
                <div class="mb-3 text-center">
                    <p class="text-muted mb-1">رصيدك المتاح حالياً للسحب</p>
                    <h2 class="text-gold" style="font-size:2.5rem; font-weight:900;">${this.availableBalance} <span style="font-size:1.2rem;">د.ل</span></h2>
                </div>

                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> المبلغ المطلوب سحبه (دينار ليبي):</label>
                    <input type="number" id="wth-amount-input" class="form-control text-center fw-bold" style="font-size:1.4rem;" max="${this.availableBalance}" min="1" step="1" placeholder="مثال: ${this.availableBalance}" required>
                    <small class="form-hint">الحد الأقصى المسموح به هو ${this.availableBalance} د.ل.</small>
                </div>

                <div class="form-group">
                    <label class="form-label">ملاحظات التحويل أو طريقة الاستلام المفضلة:</label>
                    <textarea id="wth-notes-input" class="form-control" rows="2" placeholder="مثال: تحويل مصرفي لحساب المتجر أو استلام نقدي من المقر"></textarea>
                </div>

                <div class="modal-footer px-0 pb-0 mt-4">
                    <button type="button" class="btn btn-secondary" onclick="window.MDS_APP.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn-gold">
                        <i class="fa-solid fa-paper-plane"></i> إرسال طلب السحب للإدارة
                    </button>
                </div>
            </form>
        `;

        window.MDS_APP.openModal("تقديم طلب سحب رصيد مالي", modalBody);
    }

    async submitWithdrawal(e) {
        e.preventDefault();
        const amount = document.getElementById("wth-amount-input").value;
        const notes = document.getElementById("wth-notes-input").value;
        const currentUser = window.MDS_AUTH.getCurrentUser();

        try {
            window.MDS_APP.showLoading(true);
            const req = await window.MDS_DB.createWithdrawalRequest(currentUser, amount, notes);
            window.MDS_APP.closeModal();
            window.MDS_APP.showToast("تم إرسال الطلب", `تم تقديم طلب سحب رصيد بقيمة ${amount} د.ل برقم #${req.id}. بانتظار موافقة الإدارة.`, "success");
            await this.loadInitialData();
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }
}

// تصدير وحدة تحكم الزبون
window.custCtrl = new CustomerController();
