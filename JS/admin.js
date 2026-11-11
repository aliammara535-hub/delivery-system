/**
 * ==========================================================================
 * نظام إدارة التوصيل المصغر (Mini Delivery Management System)
 * وحدة تحكم المسؤول العام (Administrator Dashboard Controller)
 * ==========================================================================
 */

class AdminController {
    constructor() {
        this.allShipments = [];
        this.allTrips = [];
        this.allCustomers = [];
        this.allDrivers = [];
        this.allCities = {};
        this.allWithdrawals = [];
        this.currentFilter = {
            search: "",
            status: "all",
            city: "all",
            customer: "all",
            driver: "all"
        };
        this.unsubscribers = [];
        this.eventsBound = false;
    }

    async init() {
        console.log("تهيئة لوحة تحكم المسؤول...");
        // إلغاء أي اشتراكات سابقة
        this.destroy();

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
                    try { unsub(); } catch (e) { console.warn("Error unsubscribing admin listener:", e); }
                }
            });
        }
        this.unsubscribers = [];
    }

    // ربط الأحداث وعناصر التحكم
    setupEventListeners() {
        // فلاتر جدول الشحنات
        const searchInput = document.getElementById("admin-shipment-search");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.currentFilter.search = e.target.value.toLowerCase().trim();
                this.renderShipmentsTable();
            });
        }

        const statusFilter = document.getElementById("admin-filter-status");
        if (statusFilter) {
            statusFilter.addEventListener("change", (e) => {
                this.currentFilter.status = e.target.value;
                this.renderShipmentsTable();
            });
        }

        const cityFilter = document.getElementById("admin-filter-city");
        if (cityFilter) {
            cityFilter.addEventListener("change", (e) => {
                this.currentFilter.city = e.target.value;
                this.renderShipmentsTable();
            });
        }

        const customerFilter = document.getElementById("admin-filter-customer");
        if (customerFilter) {
            customerFilter.addEventListener("change", (e) => {
                this.currentFilter.customer = e.target.value;
                this.renderShipmentsTable();
            });
        }

        const driverFilter = document.getElementById("admin-filter-driver");
        if (driverFilter) {
            driverFilter.addEventListener("change", (e) => {
                this.currentFilter.driver = e.target.value;
                this.renderShipmentsTable();
            });
        }
    }

    // جلب البيانات الأولية
    async loadInitialData() {
        try {
            this.allCities = await window.MDS_DB.getCities();
            this.allCustomers = await window.MDS_DB.getAllUsersByRole("customer");
            this.allDrivers = await window.MDS_DB.getAllUsersByRole("driver");
            this.allShipments = await window.MDS_DB.getAllShipments();
            this.allTrips = await window.MDS_DB.getAllTrips();
            this.allWithdrawals = await window.MDS_DB.getAllWithdrawals();

            this.populateFilterDropdowns();
            this.renderAllViews();
        } catch (error) {
            console.error("خطأ أثناء تحميل بيانات المسؤول:", error);
            window.MDS_APP.showToast("خطأ", "تعذر جلب بعض البيانات من السيرفر.", "danger");
        }
    }

    // الاشتراك بالتحديثات المباشرة Realtime
    subscribeRealtimeUpdates() {
        // شحنات
        const unsubShipments = window.MDS_DB.on("shipments", (data) => {
            this.allShipments = data ? Object.values(data) : [];
            this.renderStatistics();
            this.renderShipmentsTable();
            this.renderSettlementsList();
        });
        this.unsubscribers.push(unsubShipments);

        // رحلات
        const unsubTrips = window.MDS_DB.on("trips", (data) => {
            this.allTrips = data ? Object.values(data) : [];
            this.renderTripsList();
            this.renderStatistics();
        });
        this.unsubscribers.push(unsubTrips);

        // مدن
        const unsubCities = window.MDS_DB.on("cities", (data) => {
            if (data) {
                this.allCities = data;
                this.renderCitiesCards();
                this.populateFilterDropdowns();
            }
        });
        this.unsubscribers.push(unsubCities);

        // طلبات السحب
        const unsubWithdrawals = window.MDS_DB.on("withdrawalRequests", (data) => {
            this.allWithdrawals = data ? Object.values(data) : [];
            this.renderWithdrawalsTable();
        });
        this.unsubscribers.push(unsubWithdrawals);
    }

    // ملء القوائم المنسدلة بالفلاتر
    populateFilterDropdowns() {
        // المدن
        const citySelect = document.getElementById("admin-filter-city");
        if (citySelect) {
            const currentVal = citySelect.value;
            let optionsHtml = '<option value="all">كل المدن</option>';
            Object.values(this.allCities).forEach(c => {
                optionsHtml += `<option value="${c.key}">${c.nameAr}</option>`;
            });
            citySelect.innerHTML = optionsHtml;
            citySelect.value = currentVal;
        }

        // الزبائن
        const custSelect = document.getElementById("admin-filter-customer");
        if (custSelect) {
            const currentVal = custSelect.value;
            let optionsHtml = '<option value="all">كل الزبائن / المتاجر</option>';
            this.allCustomers.forEach(c => {
                optionsHtml += `<option value="${c.uid}">${c.storeName || c.name}</option>`;
            });
            custSelect.innerHTML = optionsHtml;
            custSelect.value = currentVal;
        }

        // المندوبين
        const driverSelect = document.getElementById("admin-filter-driver");
        if (driverSelect) {
            const currentVal = driverSelect.value;
            let optionsHtml = '<option value="all">كل المندوبين</option>';
            this.allDrivers.forEach(d => {
                optionsHtml += `<option value="${d.uid}">${d.name}</option>`;
            });
            driverSelect.innerHTML = optionsHtml;
            driverSelect.value = currentVal;
        }
    }

    // تحديث كافة الشاشات
    renderAllViews() {
        this.renderStatistics();
        this.renderShipmentsTable();
        this.renderTripsList();
        this.renderSettlementsList();
        this.renderCustomersTable();
        this.renderDriversTable();
        this.renderCitiesCards();
        this.renderWithdrawalsTable();
    }

    // ======================================================================
    // 1. الإحصائيات العامة (Overview Statistics)
    // ======================================================================
    renderStatistics() {
        const total = this.allShipments.length;
        const pending = this.allShipments.filter(s => s.status === "بانتظار الموافقة").length;
        const delivering = this.allShipments.filter(s => s.status === "قيد التوصيل").length;
        const delivered = this.allShipments.filter(s => s.status === "تم التسليم").length;
        const settled = this.allShipments.filter(s => s.status === "تسوية مالية جاهزة").length;
        const activeTrips = this.allTrips.filter(t => t.status === "نشطة").length;

        // إجمالي المبالغ المسواة
        const totalSettledAmount = this.allShipments
            .filter(s => s.status === "تسوية مالية جاهزة")
            .reduce((sum, s) => sum + (Number(s.itemValue) || 0), 0);

        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setEl("admin-stat-total-shipments", total);
        setEl("admin-stat-pending", pending);
        setEl("admin-stat-delivering", delivering);
        setEl("admin-stat-delivered", delivered);
        setEl("admin-stat-settled", settled);
        setEl("admin-stat-active-trips", activeTrips);
        setEl("admin-stat-total-amount", totalSettledAmount.toLocaleString('en-US'));

        // شارة عدد الشحنات بانتظار الموافقة في القائمة الجانبية
        const pendingBadge = document.getElementById("admin-nav-pending-badge");
        if (pendingBadge) {
            pendingBadge.textContent = pending;
            pendingBadge.style.display = pending > 0 ? "inline-block" : "none";
        }

        // شارة التسويات المعلقة
        const settleBadge = document.getElementById("admin-nav-settle-badge");
        if (settleBadge) {
            settleBadge.textContent = delivered;
            settleBadge.style.display = delivered > 0 ? "inline-block" : "none";
        }
    }

    // ======================================================================
    // 2. إدارة الشحنات وتصفيتها (Shipments Management)
    // ======================================================================
    getFilteredShipments() {
        return this.allShipments.filter(s => {
            // البحث
            if (this.currentFilter.search) {
                const q = this.currentFilter.search;
                const matchId = (s.id || "").toLowerCase().includes(q);
                const matchRecipient = (s.recipientName || "").toLowerCase().includes(q);
                const matchPhone = (s.recipientPhone || "").toLowerCase().includes(q);
                const matchCustomer = (s.customerName || "").toLowerCase().includes(q);
                if (!matchId && !matchRecipient && !matchPhone && !matchCustomer) return false;
            }
            // الحالة
            if (this.currentFilter.status !== "all" && s.status !== this.currentFilter.status) {
                return false;
            }
            // المدينة
            if (this.currentFilter.city !== "all" && s.cityKey !== this.currentFilter.city) {
                return false;
            }
            // الزبون
            if (this.currentFilter.customer !== "all" && s.customerId !== this.currentFilter.customer) {
                return false;
            }
            // المندوب
            if (this.currentFilter.driver !== "all" && s.driverId !== this.currentFilter.driver) {
                return false;
            }
            return true;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderShipmentsTable() {
        const tbody = document.getElementById("admin-shipments-table-body");
        if (!tbody) return;

        const filtered = this.getFilteredShipments();

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <div class="empty-state">
                            <div class="empty-state-icon"><i class="fa-solid fa-box-open"></i></div>
                            <h4 class="empty-state-title">لا توجد شحنات مطابقة للبحث</h4>
                            <p class="empty-state-desc">جرب تغيير معايير البحث أو الفلاتر المختارة أعلاه.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(s => {
            const dateStr = new Date(s.createdAt).toLocaleDateString('ar-LY', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const statusBadge = window.MDS_SHIPMENTS.getStatusBadge(s.status);

            let actionButtons = `
                <button class="btn btn-sm btn-outline" onclick="window.adminCtrl.viewShipmentDetails('${s.id}')" title="عرض التفاصيل وسجل الحركات">
                    <i class="fa-solid fa-eye"></i> التفاصيل
                </button>
            `;

            // إذا كانت بانتظار الموافقة، زر سريع للتعيين
            if (s.status === "بانتظار الموافقة") {
                actionButtons += `
                    <button class="btn btn-sm btn-gold" onclick="window.adminCtrl.openAssignModal('${s.id}')" title="إسناد لمندوب">
                        <i class="fa-solid fa-user-tag"></i> إسناد
                    </button>
                `;
            }

            // إذا كانت تم التسليم، زر سريع لتأكيد التسوية المالية
            if (s.status === "تم التسليم") {
                actionButtons += `
                    <button class="btn btn-sm btn-success" onclick="window.adminCtrl.confirmHandover('${s.id}')" title="تأكيد التوريد والتسوية">
                        <i class="fa-solid fa-hand-holding-dollar"></i> تأكيد تسوية
                    </button>
                `;
            }

            // زر حذف الشحنة للمسؤول
            actionButtons += `
                <button class="btn btn-sm btn-outline text-danger" style="color:var(--color-danger);" onclick="window.adminCtrl.deleteShipment('${s.id}')" title="حذف الشحنة">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            return `
                <tr>
                    <td><strong class="text-gold">#${s.id}</strong></td>
                    <td>
                        <div class="fw-bold">${s.recipientName}</div>
                        <small class="text-muted"><i class="fa-solid fa-phone"></i> ${s.recipientPhone}</small>
                    </td>
                    <td>
                        <div>${s.customerName || '-'}</div>
                    </td>
                    <td>
                        <span class="badge" style="background:#FAF7F2; border:1px solid #E2D9CF; padding:4px 8px; border-radius:6px;">
                            <i class="fa-solid fa-location-dot text-gold"></i> ${s.cityName}
                        </span>
                    </td>
                    <td>
                        <div><strong>${s.price} د.ل</strong> <small class="text-muted">(توصيل)</small></div>
                        ${s.itemValue ? `<small class="text-gold fw-bold">بضاعة: ${s.itemValue} د.ل</small>` : ''}
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        ${s.driverName ? `<div><i class="fa-solid fa-motorcycle text-muted"></i> ${s.driverName}</div>` : '<span class="text-muted">غير مسند</span>'}
                    </td>
                    <td>
                        <div class="d-flex gap-2">
                            ${actionButtons}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // عرض تفاصيل الشحنة وسجل الحركات
    async viewShipmentDetails(shipmentId) {
        const shipment = await window.MDS_DB.getShipment(shipmentId);
        if (!shipment) return;

        const history = await window.MDS_DB.getShipmentHistory(shipmentId);

        let timelineHtml = history.map(h => `
            <div class="timeline-item">
                <div class="timeline-point"></div>
                <div class="timeline-content">
                    <div class="timeline-title">${h.newStatus}</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                        بواسطة: <strong>${h.actorName}</strong> (${h.actorRole === 'admin' ? 'مدير' : h.actorRole === 'driver' ? 'مندوب' : 'متجر'})
                    </div>
                    ${h.note ? `<div style="font-size:0.82rem; color:var(--text-muted);">${h.note}</div>` : ''}
                    <div class="timeline-time"><i class="fa-regular fa-clock"></i> ${new Date(h.timestamp).toLocaleString('ar-LY')}</div>
                </div>
            </div>
        `).join("");

        if (!history || history.length === 0) {
            timelineHtml = `<p class="text-muted text-center py-3">لا يوجد سجل حركات مسجل لهذه الشحنة بعد.</p>`;
        }

        const modalBody = `
            <div class="mb-4 pb-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h3 class="text-gold">شحنة #${shipment.id}</h3>
                    ${window.MDS_SHIPMENTS.getStatusBadge(shipment.status)}
                </div>
                <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:0.92rem;">
                    <div><strong>الزبون / المتجر:</strong> ${shipment.customerName}</div>
                    <div><strong>المستلم:</strong> ${shipment.recipientName}</div>
                    <div><strong>رقم الهاتف:</strong> ${shipment.recipientPhone}</div>
                    <div><strong>المدينة:</strong> ${shipment.cityName}</div>
                    <div><strong>سعر التوصيل:</strong> ${shipment.price} د.ل</div>
                    <div><strong>قيمة البضاعة:</strong> ${shipment.itemValue || 0} د.ل</div>
                    <div><strong>المندوب المعين:</strong> ${shipment.driverName || 'غير مسند'}</div>
                    <div><strong>رقم الرحلة:</strong> ${shipment.tripId ? '#' + shipment.tripId : 'لا يوجد'}</div>
                </div>
                <div class="mt-3 p-2 bg-light rounded" style="background:#FAF8F5; border:1px solid #E8E1D9; border-radius:8px; font-size:0.9rem;">
                    <strong>تفاصيل ووصف الشحنة:</strong> ${shipment.details}
                </div>
            </div>

            <h4 style="font-size:1.05rem; font-weight:700; margin-bottom:12px; color:var(--color-primary);">
                <i class="fa-solid fa-timeline text-gold"></i> سجل مسار الشحنة (Audit Trail)
            </h4>
            <div class="timeline">
                ${timelineHtml}
            </div>
        `;

        window.MDS_APP.openModal("تفاصيل الشحنة والتاريخ الكامل", modalBody);
    }

    // حذف الشحنة من النظام
    async deleteShipment(shipmentId) {
        if (!confirm(`هل أنت متأكد من حذف الشحنة #${shipmentId} نهائياً من قاعدة البيانات؟`)) return;
        try {
            window.MDS_APP.showLoading(true);
            await window.MDS_DB.remove(`shipments/${shipmentId}`);
            window.MDS_APP.showToast("تم الحذف", `تم حذف الشحنة #${shipmentId} بنجاح.`, "info");
            await this.loadInitialData();
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }

    // ======================================================================
    // 3. إدارة الرحلات وإسناد الشحنات (Trips & Assignments)
    // ======================================================================
    renderTripsList() {
        const container = document.getElementById("admin-trips-container");
        if (!container) return;

        if (this.allTrips.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-route"></i></div>
                        <h4 class="empty-state-title">لا توجد رحلات توصيل مسجلة</h4>
                        <p class="empty-state-desc">يمكنك تنظيم وتجميع عدة شحنات في رحلة واحدة وإسنادها إلى مندوب.</p>
                        <button class="btn btn-primary" onclick="window.adminCtrl.openCreateTripModal()">
                            <i class="fa-solid fa-plus"></i> إنشاء رحلة توصيل جديدة
                        </button>
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = this.allTrips.map(trip => {
            const shipmentsCount = trip.shipmentIds ? trip.shipmentIds.length : 0;
            const statusClass = trip.status === "نشطة" ? "status-delivering" : "status-delivered";
            const dateStr = new Date(trip.createdAt).toLocaleDateString('ar-LY', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return `
                <div class="admin-trip-card">
                    <div class="admin-trip-header">
                        <div class="trip-title"><i class="fa-solid fa-route"></i> رحلة #${trip.tripNumber}</div>
                        <span class="status-badge ${statusClass}">${trip.status}</span>
                    </div>
                    <div class="admin-trip-body">
                        <div class="admin-trip-meta-row">
                            <span class="text-muted"><i class="fa-solid fa-user-astronaut text-gold"></i> المندوب السائق:</span>
                            <strong>${trip.driverName}</strong>
                        </div>
                        <div class="admin-trip-meta-row">
                            <span class="text-muted"><i class="fa-solid fa-boxes-stacked text-gold"></i> عدد الشحنات:</span>
                            <strong>${shipmentsCount} شحنة</strong>
                        </div>
                        <div class="admin-trip-meta-row">
                            <span class="text-muted"><i class="fa-regular fa-calendar text-gold"></i> تاريخ الإنشاء:</span>
                            <span>${dateStr}</span>
                        </div>
                        ${trip.notes ? `
                        <div class="admin-trip-meta-row">
                            <span class="text-muted"><i class="fa-solid fa-note-sticky text-gold"></i> ملاحظات:</span>
                            <span>${trip.notes}</span>
                        </div>` : ''}

                        <div class="mt-3 pt-2 d-flex justify-content-between align-items-center">
                            <button class="btn btn-sm btn-outline" onclick="window.adminCtrl.viewTripShipments('${trip.id}')">
                                <i class="fa-solid fa-list-check"></i> عرض شحنات الرحلة
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    // فتح نافذة إنشاء رحلة جديدة وتجميع الشحنات
    openCreateTripModal() {
        const pendingShipments = this.allShipments.filter(s => s.status === "بانتظار الموافقة");

        if (this.allDrivers.length === 0) {
            window.MDS_APP.showToast("تنبيه", "لا يوجد مناديب مسجلين لإسناد الرحلة إليهم. يرجى إضافة مندوب أولاً.", "warning");
            return;
        }

        const driversOptions = this.allDrivers
            .filter(d => d.active !== false)
            .map(d => `<option value="${d.uid}">${d.name} (${d.phone})</option>`)
            .join("");

        let shipmentsListHtml = "";
        if (pendingShipments.length === 0) {
            shipmentsListHtml = `
                <div class="p-4 text-center text-muted">
                    <i class="fa-solid fa-circle-info fa-2x mb-2 text-gold"></i>
                    <p>لا توجد حالياً شحنات بحالة "بانتظار الموافقة" لضمها إلى رحلة جديدة.</p>
                </div>
            `;
        } else {
            shipmentsListHtml = pendingShipments.map(s => `
                <label class="trip-selection-item" for="trip-shp-${s.id}">
                    <div class="trip-item-info">
                        <input type="checkbox" class="trip-checkbox trip-shipment-select" id="trip-shp-${s.id}" value="${s.id}" onchange="window.adminCtrl.updateTripSelectionSummary()">
                        <div>
                            <strong>#${s.id}</strong> - ${s.recipientName}
                            <div class="text-muted" style="font-size:0.8rem;">
                                <i class="fa-solid fa-location-dot"></i> ${s.cityName} | توصيل: ${s.price} د.ل
                            </div>
                        </div>
                    </div>
                    <span class="badge" style="background:#F5EFEB; color:#3D2314; padding:4px 8px; border-radius:6px; font-weight:700;">
                        ${s.customerName}
                    </span>
                </label>
            `).join("");
        }

        const modalBody = `
            <form id="create-trip-form" onsubmit="window.adminCtrl.submitCreateTrip(event)">
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> اختر المندوب المسؤول عن الرحلة:</label>
                    <select id="trip-driver-select" class="form-control" required>
                        <option value="">-- حدد المندوب --</option>
                        ${driversOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> اختر الشحنات المطلوب ضمها للرحلة (تصبح قيد التوصيل فوراً):</label>
                    <div class="trip-selection-list">
                        ${shipmentsListHtml}
                    </div>
                </div>

                <div class="trip-summary-box">
                    <div>
                        <strong id="trip-selected-count">0</strong> شحنات محددة
                    </div>
                    <div>
                        إجمالي رسوم التوصيل: <strong id="trip-selected-total" class="text-gold">0</strong> د.ل
                    </div>
                </div>

                <div class="form-group mt-3">
                    <label class="form-label">ملاحظات الرحلة أو خط السير (اختياري):</label>
                    <input type="text" id="trip-notes-input" class="form-control" placeholder="مثال: خط بنغازي السريع، تسليم صباحي">
                </div>

                <div class="modal-footer px-0 pb-0">
                    <button type="button" class="btn btn-secondary" onclick="window.MDS_APP.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary" ${pendingShipments.length === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-check"></i> تأكيد إنشاء الرحلة وبدء التوصيل
                    </button>
                </div>
            </form>
        `;

        window.MDS_APP.openModal("تنظيم وإنشاء رحلة توصيل جديدة", modalBody);
    }

    updateTripSelectionSummary() {
        const checkboxes = document.querySelectorAll(".trip-shipment-select:checked");
        let count = 0;
        let total = 0;

        checkboxes.forEach(cb => {
            count++;
            const shp = this.allShipments.find(s => s.id === cb.value);
            if (shp) total += Number(shp.price || 0);
        });

        const countEl = document.getElementById("trip-selected-count");
        const totalEl = document.getElementById("trip-selected-total");
        if (countEl) countEl.textContent = count;
        if (totalEl) totalEl.textContent = total;
    }

    async submitCreateTrip(e) {
        e.preventDefault();
        const driverSelect = document.getElementById("trip-driver-select");
        const driverId = driverSelect.value;
        const driver = this.allDrivers.find(d => d.uid === driverId);

        if (!driver) {
            window.MDS_APP.showToast("خطأ", "يرجى تحديد المندوب أولاً.", "danger");
            return;
        }

        const checkboxes = document.querySelectorAll(".trip-shipment-select:checked");
        const shipmentIds = Array.from(checkboxes).map(cb => cb.value);

        if (shipmentIds.length === 0) {
            window.MDS_APP.showToast("خطأ", "يجب تحديد شحنة واحدة على الأقل لإضافتها إلى الرحلة.", "danger");
            return;
        }

        const notes = document.getElementById("trip-notes-input").value;
        const currentUser = window.MDS_AUTH.getCurrentUser();

        try {
            window.MDS_APP.showLoading(true);
            const newTrip = await window.MDS_DB.createTrip({
                driverId: driver.uid,
                driverName: driver.name,
                shipmentIds: shipmentIds,
                notes: notes
            }, currentUser);

            window.MDS_APP.closeModal();
            window.MDS_APP.showToast("تم بنجاح", `تم إنشاء الرحلة #${newTrip.tripNumber} وإسناد ${shipmentIds.length} شحنة إلى المندوب ${driver.name}.`, "success");
            await this.loadInitialData();
        } catch (error) {
            console.error("خطأ إنشاء الرحلة:", error);
            window.MDS_APP.showToast("خطأ", error.message || "فشل إنشاء الرحلة.", "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }

    // إسناد سريع لشحنة مفردة لمندوب
    openAssignModal(shipmentId) {
        const shipment = this.allShipments.find(s => s.id === shipmentId);
        if (!shipment) return;

        const driversOptions = this.allDrivers
            .filter(d => d.active !== false)
            .map(d => `<option value="${d.uid}">${d.name} (${d.vehicleType || 'مندوب'})</option>`)
            .join("");

        const modalBody = `
            <form onsubmit="window.adminCtrl.submitSingleAssign(event, '${shipmentId}')">
                <div class="mb-3 p-3 bg-light rounded" style="background:#FAF8F5; border:1px solid #E8E1D9;">
                    <strong>الشحنة:</strong> #${shipment.id} | المستلم: ${shipment.recipientName} (${shipment.cityName})
                </div>

                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> اختر المندوب للإسناد المباشر:</label>
                    <select id="single-assign-driver" class="form-control" required>
                        <option value="">-- حدد المندوب --</option>
                        ${driversOptions}
                    </select>
                </div>

                <div class="modal-footer px-0 pb-0">
                    <button type="button" class="btn btn-secondary" onclick="window.MDS_APP.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn-gold">
                        <i class="fa-solid fa-check"></i> تأكيد الإسناد وبدء التوصيل
                    </button>
                </div>
            </form>
        `;

        window.MDS_APP.openModal("إسناد الشحنة إلى مندوب", modalBody);
    }

    async submitSingleAssign(e, shipmentId) {
        e.preventDefault();
        const driverId = document.getElementById("single-assign-driver").value;
        const driver = this.allDrivers.find(d => d.uid === driverId);

        if (!driver) {
            window.MDS_APP.showToast("خطأ", "يرجى تحديد المندوب.", "danger");
            return;
        }

        const currentUser = window.MDS_AUTH.getCurrentUser();
        try {
            window.MDS_APP.showLoading(true);
            // تحديث الشحنة وتعيين المندوب
            await window.MDS_DB.update(`shipments/${shipmentId}`, {
                driverId: driver.uid,
                driverName: driver.name
            });

            // تنفيذ الانتقال الصارم للحالة إلى "قيد التوصيل"
            await window.MDS_SHIPMENTS.transitionShipment(
                shipmentId,
                "قيد التوصيل",
                currentUser,
                `تم إسناد الشحنة للمندوب ${driver.name}`
            );

            window.MDS_APP.closeModal();
            window.MDS_APP.showToast("تم بنجاح", `تم إسناد الشحنة #${shipmentId} إلى المندوب ${driver.name} وأصبحت قيد التوصيل.`, "success");
            await this.loadInitialData();
        } catch (err) {
            console.error("خطأ في الإسناد:", err);
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }

    // عرض شحنات رحلة معينة
    async viewTripShipments(tripId) {
        const trip = this.allTrips.find(t => t.id === tripId);
        if (!trip) return;

        const shipments = this.allShipments.filter(s => trip.shipmentIds && trip.shipmentIds.includes(s.id));

        const listHtml = shipments.map(s => `
            <div class="card p-3 mb-2" style="background:#FAF8F5;">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong class="text-gold">#${s.id}</strong> - ${s.recipientName}
                        <div class="text-muted" style="font-size:0.85rem;"><i class="fa-solid fa-phone"></i> ${s.recipientPhone} | ${s.cityName}</div>
                    </div>
                    ${window.MDS_SHIPMENTS.getStatusBadge(s.status)}
                </div>
            </div>
        `).join("");

        window.MDS_APP.openModal(`شحنات الرحلة #${trip.tripNumber} للمندوب ${trip.driverName}`, listHtml);
    }

    // ======================================================================
    // 4. التسويات المالية وتوريد المبالغ (Financial Settlements)
    // ======================================================================
    renderSettlementsList() {
        const container = document.getElementById("admin-settlements-list");
        if (!container) return;

        // الشحنات المسلمة التي تنتظر تأكيد التوريد المالي من المدير
        const deliveredShipments = this.allShipments.filter(s => s.status === "تم التسليم");

        if (deliveredShipments.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-5">
                    <div class="empty-state-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
                    <h4 class="empty-state-title">لا توجد تسويات مالية معلقة</h4>
                    <p class="empty-state-desc">جميع المبالغ المحصلة من المندوبين تم توريدها وتأكيد تسويتها بنجاح.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = deliveredShipments.map(s => `
            <div class="settlement-card">
                <div class="settlement-details">
                    <div class="settlement-id">شحنة #${s.id}</div>
                    <div class="settlement-meta">
                        <div class="settlement-party">
                            <i class="fa-solid fa-store text-gold"></i> المتجر: <strong>${s.customerName}</strong>
                        </div>
                        <div class="settlement-party">
                            <i class="fa-solid fa-motorcycle text-muted"></i> المندوب المحصل: <strong>${s.driverName || '-'}</strong>
                        </div>
                        <small class="text-muted"><i class="fa-solid fa-location-dot"></i> ${s.cityName} | المستلم: ${s.recipientName}</small>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-3">
                    <div class="text-left">
                        <div class="settlement-amount">${s.itemValue || 0} <span>د.ل</span></div>
                        <small class="text-muted">رسوم التوصيل: ${s.price} د.ل</small>
                    </div>
                    <button class="btn btn-success" onclick="window.adminCtrl.confirmHandover('${s.id}')">
                        <i class="fa-solid fa-check-double"></i> تأكيد استلام المبلغ والتسوية
                    </button>
                </div>
            </div>
        `).join("");
    }

    // تأكيد استلام المدير للمبلغ من المندوب وتحويل الحالة إلى "تسوية مالية جاهزة"
    async confirmHandover(shipmentId) {
        const shipment = this.allShipments.find(s => s.id === shipmentId);
        if (!shipment) return;

        const confirmBody = `
            <div class="text-center p-3">
                <div class="mb-3 text-gold"><i class="fa-solid fa-coins fa-3x"></i></div>
                <h4>تأكيد التوريد المالي للشحنة #${shipment.id}</h4>
                <p class="text-secondary mt-2">
                    هل استلمت بالفعل المبلغ المالي من المندوب <strong>${shipment.driverName}</strong>؟
                </p>
                <div class="p-3 my-3 bg-light rounded text-right" style="background:#FAF8F5; border:1px solid #E8E1D9;">
                    <div><strong>قيمة البضاعة المستحقة للمتجر:</strong> <span class="text-gold fw-bold">${shipment.itemValue || 0} د.ل</span></div>
                    <div><strong>أجرة التوصيل المحصلة للشركة:</strong> <span>${shipment.price} د.ل</span></div>
                    <div><strong>المتجر المستفيد:</strong> <span>${shipment.customerName}</span></div>
                </div>
                <p style="font-size:0.85rem; color:#B7791F;">
                    <i class="fa-solid fa-triangle-exclamation"></i> بمجرد التأكيد، ستتغير الحالة فوراً إلى <strong>"تسوية مالية جاهزة"</strong> وسيتاح للمتجر سحب مستحقاته.
                </p>
                <div class="modal-footer px-0 pb-0 mt-4">
                    <button type="button" class="btn btn-secondary" onclick="window.MDS_APP.closeModal()">إلغاء</button>
                    <button type="button" class="btn btn-success" onclick="window.adminCtrl.executeHandoverConfirmation('${shipmentId}')">
                        <i class="fa-solid fa-check"></i> نعم، تأكيد استلام المبلغ
                    </button>
                </div>
            </div>
        `;

        window.MDS_APP.openModal("تأكيد التسوية المالية والتوريد", confirmBody);
    }

    async executeHandoverConfirmation(shipmentId) {
        const currentUser = window.MDS_AUTH.getCurrentUser();
        try {
            window.MDS_APP.showLoading(true);
            await window.MDS_SHIPMENTS.transitionShipment(
                shipmentId,
                "تسوية مالية جاهزة",
                currentUser,
                `تم تأكيد استلام المبلغ النقدي وتفعيل التسوية المالية للمتجر.`
            );

            window.MDS_APP.closeModal();
            window.MDS_APP.showToast("تمت التسوية بنجاح", `أصبحت الشحنة #${shipmentId} بحالة "تسوية مالية جاهزة" ويمكن للمتجر سحب الرصيد الآن.`, "success");
            await this.loadInitialData();
        } catch (error) {
            console.error("خطأ أثناء تأكيد التسوية:", error);
            window.MDS_APP.showToast("خطأ", error.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }

    // ======================================================================
    // 5. إدارة الزبائن والمتاجر (Customer Management)
    // ======================================================================
    renderCustomersTable() {
        const tbody = document.getElementById("admin-customers-table-body");
        if (!tbody) return;

        if (this.allCustomers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">لا يوجد زبائن أو متاجر مسجلين بعد.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.allCustomers.map(c => {
            const customerShipments = this.allShipments.filter(s => s.customerId === c.uid);
            const totalShipments = customerShipments.length;
            const settledCount = customerShipments.filter(s => s.status === "تسوية مالية جاهزة").length;

            return `
                <tr>
                    <td>
                        <div class="fw-bold">${c.storeName || c.name}</div>
                        <small class="text-muted">${c.name !== c.storeName ? c.name : ''}</small>
                    </td>
                    <td>${c.email}</td>
                    <td><i class="fa-solid fa-phone text-muted"></i> ${c.phone}</td>
                    <td>
                        <span class="badge" style="background:#FAF7F2; padding:4px 8px; border-radius:6px;">
                            ${totalShipments} شحنات (${settledCount} مسواة)
                        </span>
                    </td>
                    <td>
                        <span class="badge ${c.active !== false ? 'status-delivered' : 'status-pending'}">
                            ${c.active !== false ? 'نشط' : 'معطّل'}
                        </span>
                    </td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm ${c.active !== false ? 'btn-danger' : 'btn-success'}" onclick="window.adminCtrl.toggleCustomerStatus('${c.uid}', ${c.active !== false})">
                                <i class="fa-solid ${c.active !== false ? 'fa-user-slash' : 'fa-user-check'}"></i> ${c.active !== false ? 'تعطيل' : 'تفعيل'}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    openAddCustomerModal() {
        const modalBody = `
            <form onsubmit="window.adminCtrl.submitNewCustomer(event)">
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> اسم المتجر / النشاط التجاري:</label>
                    <input type="text" id="new-cust-store" class="form-control" placeholder="مثال: متجر الأندلس للملابس" required>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> اسم المسؤول / المالك:</label>
                    <input type="text" id="new-cust-name" class="form-control" placeholder="مثال: محمد علي" required>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label"><span class="required">*</span> البريد الإلكتروني:</label>
                        <input type="email" id="new-cust-email" class="form-control" placeholder="store@example.ly" required>
                    </div>
                    <div class="form-col">
                        <label class="form-label"><span class="required">*</span> رقم الهاتف:</label>
                        <input type="tel" id="new-cust-phone" class="form-control" placeholder="091XXXXXXX" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> كلمة المرور الأولية:</label>
                    <input type="password" id="new-cust-pass" class="form-control" placeholder="******" minlength="6" required>
                </div>
                <div class="modal-footer px-0 pb-0">
                    <button type="button" class="btn btn-secondary" onclick="window.MDS_APP.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> إضافة المتجر</button>
                </div>
            </form>
        `;
        window.MDS_APP.openModal("إضافة زبون / متجر جديد للنظام", modalBody);
    }

    async submitNewCustomer(e) {
        e.preventDefault();
        const storeName = document.getElementById("new-cust-store").value.trim();
        const name = document.getElementById("new-cust-name").value.trim();
        const email = document.getElementById("new-cust-email").value.trim();
        const phone = document.getElementById("new-cust-phone").value.trim();
        const pass = document.getElementById("new-cust-pass").value;

        try {
            window.MDS_APP.showLoading(true);
            await window.MDS_AUTH.registerNewUserByAdmin("customer", {
                storeName: storeName,
                name: name,
                email: email,
                phone: phone,
                balance: 0
            }, pass);

            window.MDS_APP.closeModal();
            window.MDS_APP.showToast("تم بنجاح", `تمت إضافة المتجر [${storeName}] بنجاح إلى النظام.`, "success");
            await this.loadInitialData();
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }

    async toggleCustomerStatus(uid, currentStatus) {
        try {
            await window.MDS_DB.toggleUserStatus("customer", uid, currentStatus);
            window.MDS_APP.showToast("تم التحديث", `تم ${currentStatus ? 'تعطيل' : 'تفعيل'} الحساب بنجاح.`, "info");
            await this.loadInitialData();
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        }
    }

    // ======================================================================
    // 6. إدارة المناديب والسائقين (Driver Management)
    // ======================================================================
    renderDriversTable() {
        const tbody = document.getElementById("admin-drivers-table-body");
        if (!tbody) return;

        if (this.allDrivers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">لا يوجد مناديب مسجلين حالياً.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.allDrivers.map(d => {
            const driverShipments = this.allShipments.filter(s => s.driverId === d.uid);
            const totalAssigned = driverShipments.length;
            const deliveredCount = driverShipments.filter(s => s.status === "تم التسليم" || s.status === "تسوية مالية جاهزة").length;

            return `
                <tr>
                    <td>
                        <div class="fw-bold">${d.name}</div>
                    </td>
                    <td>${d.email}</td>
                    <td><i class="fa-solid fa-phone text-muted"></i> ${d.phone}</td>
                    <td>
                        <div><i class="fa-solid fa-car-side text-gold"></i> ${d.vehicleType || 'غير محدد'}</div>
                        <small class="text-muted">${d.licensePlate || ''}</small>
                    </td>
                    <td>
                        <span class="badge" style="background:#FAF7F2; padding:4px 8px; border-radius:6px;">
                            ${totalAssigned} شحنة (${deliveredCount} مسلّمة)
                        </span>
                    </td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm ${d.active !== false ? 'btn-danger' : 'btn-success'}" onclick="window.adminCtrl.toggleDriverStatus('${d.uid}', ${d.active !== false})">
                                <i class="fa-solid ${d.active !== false ? 'fa-ban' : 'fa-check'}"></i> ${d.active !== false ? 'تعطيل' : 'تفعيل'}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    openAddDriverModal() {
        const modalBody = `
            <form onsubmit="window.adminCtrl.submitNewDriver(event)">
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> اسم المندوب الرباعي:</label>
                    <input type="text" id="new-drv-name" class="form-control" placeholder="مثال: سالم محمود الورفلي" required>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label"><span class="required">*</span> البريد الإلكتروني:</label>
                        <input type="email" id="new-drv-email" class="form-control" placeholder="driver@example.ly" required>
                    </div>
                    <div class="form-col">
                        <label class="form-label"><span class="required">*</span> رقم الهاتف:</label>
                        <input type="tel" id="new-drv-phone" class="form-control" placeholder="094XXXXXXX" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label"><span class="required">*</span> نوع وسيلة النقل:</label>
                        <input type="text" id="new-drv-vehicle" class="form-control" placeholder="مثال: سيارة خفيفة / دراجة نارية" required>
                    </div>
                    <div class="form-col">
                        <label class="form-label">رقم اللوحة المعدنية:</label>
                        <input type="text" id="new-drv-plate" class="form-control" placeholder="مثال: 12-34567">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> كلمة المرور الأولية:</label>
                    <input type="password" id="new-drv-pass" class="form-control" placeholder="******" minlength="6" required>
                </div>
                <div class="modal-footer px-0 pb-0">
                    <button type="button" class="btn btn-secondary" onclick="window.MDS_APP.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> إضافة المندوب</button>
                </div>
            </form>
        `;
        window.MDS_APP.openModal("إضافة مندوب توصيل جديد", modalBody);
    }

    async submitNewDriver(e) {
        e.preventDefault();
        const name = document.getElementById("new-drv-name").value.trim();
        const email = document.getElementById("new-drv-email").value.trim();
        const phone = document.getElementById("new-drv-phone").value.trim();
        const vehicle = document.getElementById("new-drv-vehicle").value.trim();
        const plate = document.getElementById("new-drv-plate").value.trim();
        const pass = document.getElementById("new-drv-pass").value;

        try {
            window.MDS_APP.showLoading(true);
            await window.MDS_AUTH.registerNewUserByAdmin("driver", {
                name: name,
                email: email,
                phone: phone,
                vehicleType: vehicle,
                licensePlate: plate
            }, pass);

            window.MDS_APP.closeModal();
            window.MDS_APP.showToast("تم بنجاح", `تمت إضافة المندوب [${name}] بنجاح.`, "success");
            await this.loadInitialData();
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }

    async toggleDriverStatus(uid, currentStatus) {
        try {
            await window.MDS_DB.toggleUserStatus("driver", uid, currentStatus);
            window.MDS_APP.showToast("تم التحديث", `تم ${currentStatus ? 'تعطيل' : 'تفعيل'} المندوب بنجاح.`, "info");
            await this.loadInitialData();
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        }
    }

    // ======================================================================
    // 7. إدارة المدن والأسعار (Cities & Pricing Management)
    // ======================================================================
    renderCitiesCards() {
        const container = document.getElementById("admin-cities-grid");
        if (!container) return;

        const cities = Object.values(this.allCities);

        container.innerHTML = cities.map(c => `
            <div class="city-card">
                <div class="city-card-header">
                    <div class="city-name"><i class="fa-solid fa-city"></i> ${c.nameAr}</div>
                    <small class="text-muted">${c.nameEn || ''}</small>
                </div>
                <div class="city-price-wrap">
                    <span class="city-price-value" id="city-price-val-${c.key}">${c.price}</span>
                    <span class="city-price-curr">د.ل</span>
                </div>
                <button class="btn btn-sm btn-outline-gold w-100" onclick="window.adminCtrl.openEditPriceModal('${c.key}', '${c.nameAr}', ${c.price})">
                    <i class="fa-solid fa-pen-to-square"></i> تعديل سعر التوصيل
                </button>
            </div>
        `).join("");
    }

    openEditPriceModal(cityKey, nameAr, currentPrice) {
        const modalBody = `
            <form onsubmit="window.adminCtrl.submitEditPrice(event, '${cityKey}')">
                <div class="mb-3 text-center">
                    <h4 class="text-gold"><i class="fa-solid fa-city"></i> ${nameAr}</h4>
                    <p class="text-muted">تحديث سعر التوصيل المعتمد لمدينة ${nameAr} في Firebase Realtime Database.</p>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> سعر التوصيل الجديد (بالدينار الليبي):</label>
                    <input type="number" id="edit-city-price-input" class="form-control text-center fw-bold" style="font-size:1.4rem;" value="${currentPrice}" min="1" step="0.5" required>
                </div>
                <div class="modal-footer px-0 pb-0">
                    <button type="button" class="btn btn-secondary" onclick="window.MDS_APP.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn-gold"><i class="fa-solid fa-save"></i> حفظ السعر الجديد</button>
                </div>
            </form>
        `;
        window.MDS_APP.openModal(`تعديل سعر التوصيل - ${nameAr}`, modalBody);
    }

    async submitEditPrice(e, cityKey) {
        e.preventDefault();
        const newPrice = document.getElementById("edit-city-price-input").value;
        try {
            window.MDS_APP.showLoading(true);
            await window.MDS_DB.updateCityPrice(cityKey, newPrice);
            window.MDS_APP.closeModal();
            window.MDS_APP.showToast("تم تحديث السعر", `تم تحديث سعر التوصيل إلى ${newPrice} د.ل بنجاح وحفظه في Firebase.`, "success");
            await this.loadInitialData();
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }

    openAddCityModal() {
        const modalBody = `
            <form onsubmit="window.adminCtrl.submitNewCity(event)">
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> اسم المدينة بالعربية:</label>
                    <input type="text" id="new-city-ar" class="form-control" placeholder="مثال: سبها" required>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> اسم المدينة بالإنجليزية (مفتاح الرمز):</label>
                    <input type="text" id="new-city-en" class="form-control" placeholder="مثال: Sabha" required>
                </div>
                <div class="form-group">
                    <label class="form-label"><span class="required">*</span> سعر التوصيل الافتراضي (دينار ليبي):</label>
                    <input type="number" id="new-city-price" class="form-control" placeholder="40" min="1" step="1" required>
                </div>
                <div class="modal-footer px-0 pb-0">
                    <button type="button" class="btn btn-secondary" onclick="window.MDS_APP.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> إضافة المدينة</button>
                </div>
            </form>
        `;
        window.MDS_APP.openModal("إضافة مدينة جديدة إلى النظام", modalBody);
    }

    async submitNewCity(e) {
        e.preventDefault();
        const ar = document.getElementById("new-city-ar").value.trim();
        const en = document.getElementById("new-city-en").value.trim();
        const price = document.getElementById("new-city-price").value;

        try {
            window.MDS_APP.showLoading(true);
            await window.MDS_DB.addCity(en, ar, en, price);
            window.MDS_APP.closeModal();
            window.MDS_APP.showToast("تمت إضافة المدينة", `تمت إضافة مدينة [${ar}] بسعر توصيل ${price} د.ل.`, "success");
            await this.loadInitialData();
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }

    // ======================================================================
    // 8. طلبات سحب الأرصدة (Withdrawal Requests Approval)
    // ======================================================================
    renderWithdrawalsTable() {
        const tbody = document.getElementById("admin-withdrawals-table-body");
        if (!tbody) return;

        if (this.allWithdrawals.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">لا توجد طلبات سحب رصيد مقدمة حتى الآن.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.allWithdrawals.sort((a,b) => new Date(b.requestDate) - new Date(a.requestDate)).map(w => {
            const dateStr = new Date(w.requestDate).toLocaleDateString('ar-LY', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            let statusBadge = `<span class="withdrawal-badge withdrawal-pending">قيد المراجعة</span>`;
            if (w.status === "approved") {
                statusBadge = `<span class="withdrawal-badge withdrawal-approved">معتمد ومصروف</span>`;
            } else if (w.status === "rejected") {
                statusBadge = `<span class="withdrawal-badge withdrawal-rejected">مرفوض</span>`;
            }

            let actionBtn = '-';
            if (w.status === "pending") {
                actionBtn = `
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-success" onclick="window.adminCtrl.processWithdrawal('${w.id}', 'approved')" title="الموافقة والصرف">
                            <i class="fa-solid fa-check"></i> موافقة
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.adminCtrl.processWithdrawal('${w.id}', 'rejected')" title="رفض الطلب">
                            <i class="fa-solid fa-xmark"></i> رفض
                        </button>
                    </div>
                `;
            }

            return `
                <tr>
                    <td><strong class="text-gold">#${w.id}</strong></td>
                    <td>
                        <div class="fw-bold">${w.customerName}</div>
                        <small class="text-muted">${w.customerPhone || ''}</small>
                    </td>
                    <td><strong class="text-primary">${w.amount} د.ل</strong></td>
                    <td>${dateStr}</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        }).join("");
    }

    async processWithdrawal(reqId, status) {
        const req = this.allWithdrawals.find(w => w.id === reqId);
        if (!req) return;

        const actionText = status === "approved" ? "الموافقة على صرف" : "رفض";
        if (!confirm(`هل أنت متأكد من ${actionText} طلب السحب بقيمة ${req.amount} د.ل للمتجر [${req.customerName}]؟`)) {
            return;
        }

        const currentUser = window.MDS_AUTH.getCurrentUser();
        try {
            window.MDS_APP.showLoading(true);
            await window.MDS_DB.processWithdrawalRequest(reqId, status, currentUser);
            window.MDS_APP.showToast("تم التحديث", `تم ${actionText} الطلب بنجاح.`, "success");
            await this.loadInitialData();
        } catch (err) {
            window.MDS_APP.showToast("خطأ", err.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }
}

// تصدير وحدة تحكم المسؤول
window.adminCtrl = new AdminController();
