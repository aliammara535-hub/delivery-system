/**
 * ==========================================================================
 * نظام إدارة التوصيل المصغر (Mini Delivery Management System)
 * وحدة تحكم مندوب التوصيل (Driver / Representative Dashboard Controller)
 * ==========================================================================
 */

class DriverController {
    constructor() {
        this.myTrips = [];
        this.myShipments = [];
        this.currentTab = "active-trips";
        this.unsubscribers = [];
        this.eventsBound = false;
    }

    async init() {
        console.log("تهيئة لوحة تحكم مندوب التوصيل...");
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
                    try { unsub(); } catch (e) { console.warn("Error unsubscribing driver listener:", e); }
                }
            });
        }
        this.unsubscribers = [];
    }

    setupEventListeners() {
        // أزرار التبويب بين الرحلات النشطة والأرشيف
        const tripTabs = document.querySelectorAll(".driver-trips-tab");
        tripTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tripTabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                this.currentTab = tab.getAttribute("data-tab");
                this.renderTripsAndShipments();
            });
        });
    }

    // جلب بيانات المندوب الحالي فقط
    async loadInitialData() {
        const currentUser = window.MDS_AUTH.getCurrentUser();
        if (!currentUser) return;

        try {
            // جلب رحلات وشحنات هذا المندوب فقط
            this.myTrips = await window.MDS_DB.getDriverTrips(currentUser.uid);
            this.myShipments = await window.MDS_DB.getDriverShipments(currentUser.uid);

            this.renderAllViews();
        } catch (error) {
            console.error("خطأ أثناء تحميل بيانات المندوب:", error);
            window.MDS_APP.showToast("خطأ", "تعذر جلب بيانات الرحلات المسندة.", "danger");
        }
    }

    // الاشتراك بالتحديثات المباشرة Realtime لرحلات وشحنات المندوب
    subscribeRealtimeUpdates() {
        const currentUser = window.MDS_AUTH.getCurrentUser();
        if (!currentUser) return;

        // الاستماع للشحنات وتصفية شحنات المندوب
        const unsubShipments = window.MDS_DB.on("shipments", (data) => {
            if (data) {
                const all = Object.values(data);
                this.myShipments = all.filter(s => s.driverId === currentUser.uid);
            } else {
                this.myShipments = [];
            }
            this.renderAllViews();
        });
        this.unsubscribers.push(unsubShipments);

        // الاستماع للرحلات
        const unsubTrips = window.MDS_DB.on("trips", (data) => {
            if (data) {
                const all = Object.values(data);
                this.myTrips = all.filter(t => t.driverId === currentUser.uid);
            } else {
                this.myTrips = [];
            }
            this.renderAllViews();
        });
        this.unsubscribers.push(unsubTrips);
    }

    renderAllViews() {
        this.renderStats();
        this.renderTripsAndShipments();
    }

    // ======================================================================
    // 1. إحصائيات المندوب (Driver Statistics)
    // ======================================================================
    renderStats() {
        const total = this.myShipments.length;
        const activeDelivering = this.myShipments.filter(s => s.status === "قيد التوصيل").length;
        const delivered = this.myShipments.filter(s => s.status === "تم التسليم" || s.status === "تسوية مالية جاهزة").length;
        const activeTrips = this.myTrips.filter(t => t.status === "نشطة").length;

        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setEl("driver-stat-total-assigned", total);
        setEl("driver-stat-active-delivering", activeDelivering);
        setEl("driver-stat-delivered", delivered);
        setEl("driver-stat-active-trips", activeTrips);
    }

    // ======================================================================
    // 2. عرض رحلات التوصيل وبطاقات الشحنات المتداخلة (Nested Trips & Shipments)
    // ======================================================================
    renderTripsAndShipments() {
        const container = document.getElementById("driver-trips-container");
        if (!container) return;

        // تصفية الرحلات بحسب التبويب (نشطة أو سابقة)
        let tripsToShow = this.myTrips;
        if (this.currentTab === "active-trips") {
            tripsToShow = this.myTrips.filter(t => t.status === "نشطة");
        } else if (this.currentTab === "completed-trips") {
            tripsToShow = this.myTrips.filter(t => t.status === "مكتملة");
        }

        if (tripsToShow.length === 0) {
            const msg = this.currentTab === "active-trips"
                ? "لا توجد رحلات توصيل نشطة مسندة إليك حالياً. يرجى انتظار تعيين رحلات جديدة من الإدارة."
                : "لا توجد رحلات سابقة مكتملة في الأرشيف.";

            container.innerHTML = `
                <div class="empty-state py-5">
                    <div class="empty-state-icon"><i class="fa-solid fa-truck"></i></div>
                    <h4 class="empty-state-title">لا توجد رحلات معروضة</h4>
                    <p class="empty-state-desc">${msg}</p>
                </div>
            `;
            return;
        }

        // بناء بطاقات الرحلات الكبرى وبداخلها الشحنات الصغرى
        container.innerHTML = tripsToShow.map(trip => {
            // جلب شحنات هذه الرحلة بالتحديد
            const tripShipments = this.myShipments.filter(s => trip.shipmentIds && trip.shipmentIds.includes(s.id));
            const totalInTrip = tripShipments.length;
            const deliveredInTrip = tripShipments.filter(s => s.status === "تم التسليم" || s.status === "تسوية مالية جاهزة").length;

            const dateStr = new Date(trip.createdAt).toLocaleDateString('ar-LY', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            // توليد بطاقات الشحنات الصغرى المتضمنة داخل الرحلة
            let shipmentsCardsHtml = "";
            if (tripShipments.length === 0) {
                shipmentsCardsHtml = `<div class="col-12 text-muted text-center py-3">لا توجد شحنات متبقية في هذه الرحلة.</div>`;
            } else {
                shipmentsCardsHtml = tripShipments.map(s => {
                    const isDelivered = s.status === "تم التسليم" || s.status === "تسوية مالية جاهزة";
                    const isReadyToDeliver = s.status === "قيد التوصيل";
                    const cleanPhone = (s.recipientPhone || "").replace(/[^0-9]/g, "");

                    let actionSectionHtml = "";
                    if (isReadyToDeliver) {
                        actionSectionHtml = `
                            <button class="btn btn-confirm-delivery" onclick="window.driverCtrl.openDeliverConfirmModal('${s.id}')">
                                <i class="fa-solid fa-check"></i> تأكيد التسليم (تم التسليم)
                            </button>
                        `;
                    } else if (isDelivered) {
                        actionSectionHtml = `
                            <span class="delivery-done-stamp">
                                <i class="fa-solid fa-circle-check"></i> تم التسليم بنجاح
                            </span>
                        `;
                    } else {
                        actionSectionHtml = `<span class="text-muted" style="font-size:0.85rem;">${s.status}</span>`;
                    }

                    return `
                        <div class="driver-shipment-card ${isDelivered ? 'delivered-card' : ''}">
                            <div>
                                <div class="driver-shipment-header">
                                    <span class="driver-shipment-id">#${s.id}</span>
                                    ${window.MDS_SHIPMENTS.getStatusBadge(s.status)}
                                </div>

                                <div class="driver-shipment-info">
                                    <div class="driver-recipient-name">
                                        <i class="fa-solid fa-user-check"></i> ${s.recipientName}
                                    </div>

                                    <div class="driver-phone-links">
                                        <a href="tel:${cleanPhone}" class="phone-quick-btn phone-call-btn">
                                            <i class="fa-solid fa-phone"></i> اتصال: ${s.recipientPhone}
                                        </a>
                                        <a href="https://wa.me/218${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}" target="_blank" class="phone-quick-btn phone-wa-btn" title="محادثة واتساب سريعة">
                                            <i class="fa-brands fa-whatsapp"></i> واتساب
                                        </a>
                                    </div>

                                    <div class="driver-info-row mt-2">
                                        <i class="fa-solid fa-location-dot"></i>
                                        <span>المدينة / الوجهة: <strong>${s.cityName}</strong></span>
                                    </div>

                                    <div class="driver-info-row">
                                        <i class="fa-solid fa-store"></i>
                                        <span>المتجر المصدر: <strong>${s.customerName}</strong></span>
                                    </div>

                                    <div class="driver-shipment-desc mt-1">
                                        <strong>الوصف:</strong> ${s.details}
                                    </div>

                                    ${s.itemValue ? `
                                    <div class="mt-2 p-2 rounded text-center" style="background:#FFF9E6; border:1px solid #FFE082; font-size:0.88rem;">
                                        المبلغ المطلوب تحصيله من الزبون: <strong class="text-gold" style="font-size:1.05rem;">${s.itemValue} د.ل</strong>
                                    </div>` : ''}
                                </div>
                            </div>

                            <div class="driver-shipment-footer">
                                <div class="driver-price-tag">
                                    <span>رسوم التوصيل:</span> ${s.price} <span>د.ل</span>
                                </div>
                                <div>
                                    ${actionSectionHtml}
                                </div>
                            </div>
                        </div>
                    `;
                }).join("");
            }

            return `
                <div class="driver-trip-container">
                    <div class="trip-banner-header">
                        <div class="trip-banner-title">
                            <div class="trip-icon-badge">
                                <i class="fa-solid fa-route"></i>
                            </div>
                            <div>
                                <div class="trip-title-text">رحلة توصيل #${trip.tripNumber}</div>
                                <div class="trip-date-text"><i class="fa-regular fa-clock"></i> تاريخ الإنشاء: ${dateStr}</div>
                            </div>
                        </div>

                        <div class="trip-banner-stats">
                            <div class="trip-stat-pill">
                                <i class="fa-solid fa-box-archive"></i>
                                <span>الشحنات: <strong>${deliveredInTrip} / ${totalInTrip}</strong> مسلّمة</span>
                            </div>
                            <span class="status-badge ${trip.status === 'نشطة' ? 'status-delivering' : 'status-delivered'}">
                                ${trip.status}
                            </span>
                        </div>
                    </div>

                    ${trip.notes ? `
                    <div class="px-4 py-2" style="background:#FAF7F2; border-bottom:1px solid #E8E1D9; font-size:0.88rem; color:var(--text-secondary);">
                        <i class="fa-solid fa-circle-info text-gold"></i> ملاحظات الرحلة: <strong>${trip.notes}</strong>
                    </div>` : ''}

                    <div class="trip-shipments-wrapper">
                        <div class="trip-shipments-heading">
                            <i class="fa-solid fa-boxes-stacked text-gold"></i>
                            <span>قائمة الشحنات المكلف بتوصيلها في هذه الرحلة (${totalInTrip}):</span>
                        </div>
                        <div class="trip-shipments-grid">
                            ${shipmentsCardsHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    // ======================================================================
    // 3. تأكيد تسليم الشحنة للزبون (Mark as Delivered)
    // ======================================================================
    openDeliverConfirmModal(shipmentId) {
        const shipment = this.myShipments.find(s => s.id === shipmentId);
        if (!shipment) return;

        const modalBody = `
            <div class="text-center p-3">
                <div class="mb-3 text-success"><i class="fa-solid fa-circle-check fa-3x"></i></div>
                <h4 style="color:var(--color-primary);">تأكيد تسليم الشحنة #${shipment.id}</h4>
                <p class="text-secondary mt-2">
                    هل تم تسليم الشحنة بنجاح إلى المستلم <strong>${shipment.recipientName}</strong> واستلام المبلغ المالي؟
                </p>

                <div class="p-3 my-3 bg-light rounded text-right" style="background:#FAF8F5; border:1px solid #E8E1D9;">
                    <div><strong>المدينة:</strong> ${shipment.cityName}</div>
                    <div><strong>هاتف المستلم:</strong> ${shipment.recipientPhone}</div>
                    ${shipment.itemValue ? `<div><strong>المبلغ المحصل من الزبون:</strong> <span class="text-gold fw-bold">${shipment.itemValue} د.ل</span></div>` : ''}
                    <div><strong>أجرة التوصيل:</strong> <span>${shipment.price} د.ل</span></div>
                </div>

                <p style="font-size:0.85rem; color:var(--text-muted);">
                    <i class="fa-solid fa-shield"></i> بعد التأكيد، ستتحول الحالة إلى <strong>"تم التسليم"</strong> لتتمكن الإدارة من استلام المبلغ وتأكيد التسوية للمتجر.
                </p>

                <div class="modal-footer px-0 pb-0 mt-4">
                    <button type="button" class="btn btn-secondary" onclick="window.MDS_APP.closeModal()">إلغاء</button>
                    <button type="button" class="btn btn-success" onclick="window.driverCtrl.executeDeliveryConfirmation('${shipmentId}')">
                        <i class="fa-solid fa-check-double"></i> نعم، تم التسليم بنجاح
                    </button>
                </div>
            </div>
        `;

        window.MDS_APP.openModal("تأكيد إتمام توصيل الشحنة", modalBody);
    }

    async executeDeliveryConfirmation(shipmentId) {
        const currentUser = window.MDS_AUTH.getCurrentUser();
        try {
            window.MDS_APP.showLoading(true);

            // استدعاء التحقق والانتقال الصارم: من "قيد التوصيل" -> "تم التسليم" فقط للمندوب المعين
            await window.MDS_SHIPMENTS.transitionShipment(
                shipmentId,
                "تم التسليم",
                currentUser,
                `قام المندوب [${currentUser.name}] بتسليم الشحنة للمستلم وتحصيل المبلغ.`
            );

            window.MDS_APP.closeModal();
            window.MDS_APP.showToast("تم التسليم بنجاح", `تم تسجيل الشحنة #${shipmentId} بحالة "تم التسليم". شكراً لك!`, "success");
            await this.loadInitialData();
        } catch (error) {
            console.error("خطأ تأكيد التسليم:", error);
            window.MDS_APP.showToast("خطأ", error.message, "danger");
        } finally {
            window.MDS_APP.showLoading(false);
        }
    }
}

// تصدير وحدة تحكم المندوب
window.driverCtrl = new DriverController();
