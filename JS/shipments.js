/**
 * ==========================================================================
 * نظام إدارة التوصيل المصغر (Mini Delivery Management System)
 * دورة حياة الشحنات والتحقق الأمني من الحالات (Shipments Lifecycle & Business Logic)
 * ==========================================================================
 */

// حالات الشحنة الرسمية باللغة العربية
const SHIPMENT_STATUS = {
    PENDING: "بانتظار الموافقة",
    DELIVERING: "قيد التوصيل",
    DELIVERED: "تم التسليم",
    SETTLED: "تسوية مالية جاهزة"
};

// قواعد الانتقال الصارمة بين الحالات والصلاحيات المسموح بها لكل مرحلة
const STATUS_TRANSITION_RULES = {
    // 1. الانتقال من "بانتظار الموافقة" إلى "قيد التوصيل": للمدير فقط عند التعيين لمندوب
    "بانتظار الموافقة": {
        allowedNext: "قيد التوصيل",
        allowedRoles: ["admin"],
        actionName: "إسناد لمندوب وبدء التوصيل"
    },
    // 2. الانتقال من "قيد التوصيل" إلى "تم التسليم": للمندوب المسند له الشحنة فقط
    "قيد التوصيل": {
        allowedNext: "تم التسليم",
        allowedRoles: ["driver"],
        actionName: "تأكيد تسليم الشحنة للزبون"
    },
    // 3. الانتقال من "تم التسليم" إلى "تسوية مالية جاهزة": للمدير فقط عند استلام المبلغ وتوريده
    "تم التسليم": {
        allowedNext: "تسوية مالية جاهزة",
        allowedRoles: ["admin"],
        actionName: "تأكيد التوريد المالي وجاهزية التسوية"
    },
    // 4. "تسوية مالية جاهزة" هي الحالة النهائية للشحنة
    "تسوية مالية جاهزة": {
        allowedNext: null,
        allowedRoles: [],
        actionName: "شحنة منتهية ومسواة مالياً"
    }
};

class ShipmentsManager {
    constructor() {}

    // التحقق من صحة وصلاحية تغيير الحالة
    validateTransition(currentStatus, targetStatus, currentUser, shipment) {
        if (!currentUser) {
            return { valid: false, message: "يجب تسجيل الدخول أولاً لتنفيذ هذه العملية." };
        }

        const rule = STATUS_TRANSITION_RULES[currentStatus];
        if (!rule) {
            return { valid: false, message: `الحالة الحالية [${currentStatus}] غير معروفة في النظام.` };
        }

        if (rule.allowedNext === null) {
            return { valid: false, message: "هذه الشحنة مكتملة ومسواة مالياً بالفعل، ولا يمكن تغيير حالتها مجدداً." };
        }

        if (rule.allowedNext !== targetStatus) {
            return {
                valid: false,
                message: `لا يمكن تخطي المراحل. الانتقال المسموح به بعد [${currentStatus}] هو فقط [${rule.allowedNext}].`
            };
        }

        // التحقق من صلاحية الدور
        if (!rule.allowedRoles.includes(currentUser.role)) {
            return {
                valid: false,
                message: `غير مصرح: هذا التغيير مخصص لدور [${rule.allowedRoles.join(" أو ")}] فقط.`
            };
        }

        // إذا كان المندوب هو من ينفذ، يجب التأكد أنه هو المندوب المسند إليه تحديداً
        if (currentUser.role === "driver") {
            if (!shipment || shipment.driverId !== currentUser.uid) {
                return {
                    valid: false,
                    message: "غير مصرح لك: هذه الشحنة ليست مسندة إليك ولا يمكنك تغيير حالتها."
                };
            }
        }

        return { valid: true };
    }

    // تنفيذ الانتقال الآمن للشحنة
    async transitionShipment(shipmentId, targetStatus, currentUser, optionalNote = "") {
        // جلب أحدث بيانات الشحنة من قاعدة البيانات
        const shipment = await window.MDS_DB.getShipment(shipmentId);
        if (!shipment) {
            throw new Error(`الشحنة برقم #${shipmentId} غير موجودة.`);
        }

        const currentStatus = shipment.status;

        // التحقق الصارم من قواعد الانتقال
        const check = this.validateTransition(currentStatus, targetStatus, currentUser, shipment);
        if (!check.valid) {
            throw new Error(check.message);
        }

        const updates = {
            status: targetStatus,
            updatedAt: new Date().toISOString()
        };

        // إجراءات إضافية بناء على الحالة الجديدة
        if (targetStatus === SHIPMENT_STATUS.DELIVERED) {
            updates.deliveredAt = new Date().toISOString();
        } else if (targetStatus === SHIPMENT_STATUS.SETTLED) {
            // التحقق من منع التكرار المالي
            if (shipment.settlementConfirmed) {
                throw new Error("تم تأكيد التسوية المالية لهذه الشحنة مسبقاً لمنع التكرار.");
            }
            updates.settlementConfirmed = true;
            updates.settledAt = new Date().toISOString();
            updates.settledBy = currentUser.name;

            // تسجيل حركة مالية للمتجر/الزبون
            const trxId = `TRX-${Date.now().toString().slice(-5)}`;
            await window.MDS_DB.set(`financialTransactions/${trxId}`, {
                id: trxId,
                customerId: shipment.customerId,
                customerName: shipment.customerName,
                shipmentId: shipment.id,
                amount: shipment.itemValue || 0,
                deliveryFee: shipment.price || 0,
                type: "تسوية شحنة مسلمة",
                status: "متاحة للسحب",
                createdAt: new Date().toISOString(),
                confirmedBy: currentUser.name
            });
        }

        // تطبيق التحديث في قاعدة البيانات
        await window.MDS_DB.update(`shipments/${shipmentId}`, updates);

        // تسجيل في سجل الحركات والتدقيق التاريخي
        await window.MDS_DB.logShipmentHistory({
            shipmentId: shipmentId,
            previousStatus: currentStatus,
            newStatus: targetStatus,
            actorId: currentUser.uid,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            note: optionalNote || `تغيير الحالة إلى [${targetStatus}] بواسطة ${currentUser.name}`
        });

        return { ...shipment, ...updates };
    }

    // توليد شارة الحالة المنسقة (HTML Status Badge)
    getStatusBadge(status) {
        let badgeClass = "status-pending";
        let icon = "fa-clock";

        switch (status) {
            case SHIPMENT_STATUS.PENDING:
                badgeClass = "status-pending";
                icon = "fa-hourglass-half";
                break;
            case SHIPMENT_STATUS.DELIVERING:
                badgeClass = "status-delivering";
                icon = "fa-truck-fast";
                break;
            case SHIPMENT_STATUS.DELIVERED:
                badgeClass = "status-delivered";
                icon = "fa-circle-check";
                break;
            case SHIPMENT_STATUS.SETTLED:
                badgeClass = "status-settled";
                icon = "fa-coins";
                break;
            default:
                badgeClass = "status-pending";
                icon = "fa-circle";
        }

        return `<span class="status-badge ${badgeClass}"><i class="fa-solid ${icon}"></i> ${status}</span>`;
    }

    // التحقق من بيانات إنشاء الشحنة الجديدة
    validateNewShipmentData(data) {
        const errors = [];

        if (!data.recipientName || data.recipientName.trim().length < 3) {
            errors.push("اسم المستلم مطلوب ويجب ألا يقل عن 3 أحرف.");
        }

        const phoneClean = (data.recipientPhone || "").replace(/[^0-9]/g, "");
        if (!phoneClean || phoneClean.length < 8) {
            errors.push("يرجى إدخال رقم هاتف صحيح للمستلم.");
        }

        if (!data.details || data.details.trim().length < 3) {
            errors.push("تفاصيل ووصف الشحنة مطلوبة.");
        }

        if (!data.cityKey) {
            errors.push("يرجى تحديد مدينة الوجهة.");
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// تصدير مدير الشحنات
window.MDS_SHIPMENTS = new ShipmentsManager();
