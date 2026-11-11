/**
 * ==========================================================================
 * نظام إدارة التوصيل المصغر (Mini Delivery Management System)
 * طبقة إدارة قاعدة بيانات Firebase Realtime Database
 * ==========================================================================
 */

const DB_ROOT = "MiniDeliverySystem";

// البيانات الابتدائية للمدن والأسعار حسب المتطلبات
const INITIAL_CITIES = {
    benghazi: { key: "benghazi", nameAr: "بنغازي", nameEn: "Benghazi", price: 30, active: true },
    misrata: { key: "misrata", nameAr: "مصراتة", nameEn: "Misrata", price: 20, active: true },
    tarhuna: { key: "tarhuna", nameAr: "ترهونة", nameEn: "Tarhuna", price: 25, active: true },
    albayda: { key: "albayda", nameAr: "البيضاء", nameEn: "Al Bayda", price: 35, active: true }
};

// البيانات الأولية الافتراضية للحسابات التجريبية
const INITIAL_USERS = {
    admins: {
        "admin-01": {
            uid: "admin-01",
            name: "المدير العام للنظام",
            email: "admin@delivery.ly",
            phone: "0912345678",
            role: "admin",
            active: true,
            createdAt: new Date().toISOString()
        }
    },
    customers: {
        "cust-01": {
            uid: "cust-01",
            name: "متجر النور للإلكترونيات",
            storeName: "متجر النور",
            email: "store@delivery.ly",
            phone: "0923456789",
            role: "customer",
            balance: 0,
            active: true,
            createdAt: new Date().toISOString()
        },
        "cust-02": {
            uid: "cust-02",
            name: "بوتيك الأناقة للملابس",
            storeName: "بوتيك الأناقة",
            email: "elegance@delivery.ly",
            phone: "0918765432",
            role: "customer",
            balance: 0,
            active: true,
            createdAt: new Date().toISOString()
        }
    },
    drivers: {
        "driver-01": {
            uid: "driver-01",
            name: "أحمد بن علي",
            email: "driver@delivery.ly",
            phone: "0945678901",
            vehicleType: "سيارة نقل خفيف (هيونداي)",
            licensePlate: "12-34567",
            role: "driver",
            active: true,
            createdAt: new Date().toISOString()
        },
        "driver-02": {
            uid: "driver-02",
            name: "سالم محمود الورفلي",
            email: "salem@delivery.ly",
            phone: "0934567890",
            vehicleType: "دراجة نارية",
            licensePlate: "05-98765",
            role: "driver",
            active: true,
            createdAt: new Date().toISOString()
        }
    }
};

// شحنات أولية توضيحية لسرعة التجربة
const INITIAL_SHIPMENTS = {
    "SHP-101": {
        id: "SHP-101",
        customerId: "cust-01",
        customerName: "متجر النور للإلكترونيات",
        recipientName: "عمر فتحي المبروك",
        recipientPhone: "0915551234",
        details: "سماعات بلوتوث لاسلكية وشاحن سريع",
        cityKey: "benghazi",
        cityName: "بنغازي",
        price: 30,
        itemValue: 120, // قيمة البضاعة للمتجر
        status: "بانتظار الموافقة",
        driverId: null,
        driverName: null,
        tripId: null,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    "SHP-102": {
        id: "SHP-102",
        customerId: "cust-01",
        customerName: "متجر النور للإلكترونيات",
        recipientName: "خالد سعيد الغرياني",
        recipientPhone: "0926667890",
        details: "ساعة يد ذكية مقاومة للماء",
        cityKey: "misrata",
        cityName: "مصراتة",
        price: 20,
        itemValue: 250,
        status: "قيد التوصيل",
        driverId: "driver-01",
        driverName: "أحمد بن علي",
        tripId: "TRP-001",
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    "SHP-103": {
        id: "SHP-103",
        customerId: "cust-02",
        customerName: "بوتيك الأناقة للملابس",
        recipientName: "فاطمة محمد المقريف",
        recipientPhone: "0917774321",
        details: "فستان سهرة وعباية مطرزة",
        cityKey: "tarhuna",
        cityName: "ترهونة",
        price: 25,
        itemValue: 180,
        status: "تم التسليم",
        driverId: "driver-01",
        driverName: "أحمد بن علي",
        tripId: "TRP-001",
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 1).toISOString()
    },
    "SHP-104": {
        id: "SHP-104",
        customerId: "cust-01",
        customerName: "متجر النور للإلكترونيات",
        recipientName: "عبدالله مصطفى الكيلاني",
        recipientPhone: "0928889900",
        details: "كاميرا مراقبة ذكية داخلية",
        cityKey: "albayda",
        cityName: "البيضاء",
        price: 35,
        itemValue: 310,
        status: "تسوية مالية جاهزة",
        driverId: "driver-02",
        driverName: "سالم محمود الورفلي",
        tripId: "TRP-002",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 3).toISOString()
    }
};

const INITIAL_TRIPS = {
    "TRP-001": {
        id: "TRP-001",
        tripNumber: "TRP-001",
        driverId: "driver-01",
        driverName: "أحمد بن علي",
        status: "نشطة", // نشطة أو مكتملة
        shipmentIds: ["SHP-102", "SHP-103"],
        notes: "رحلة خط مصراتة - ترهونة",
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    "TRP-002": {
        id: "TRP-002",
        tripNumber: "TRP-002",
        driverId: "driver-02",
        driverName: "سالم محمود الورفلي",
        status: "مكتملة",
        shipmentIds: ["SHP-104"],
        notes: "رحلة المنطقة الشرقية (البيضاء)",
        createdAt: new Date(Date.now() - 3600000 * 26).toISOString()
    }
};

// ==========================================================================
// محاكي قاعدة البيانات المحلي (Local Database Simulator for Offline/Demo)
// ==========================================================================
class LocalDatabaseStore {
    constructor() {
        this.storageKey = "MDS_LOCAL_RTDB_DATA";
        this.listeners = {};
        this.init();
    }

    init() {
        const existing = localStorage.getItem(this.storageKey);
        if (!existing) {
            this.seed();
        }
    }

    seed() {
        const seedData = {
            cities: INITIAL_CITIES,
            users: INITIAL_USERS,
            shipments: INITIAL_SHIPMENTS,
            trips: INITIAL_TRIPS,
            financialTransactions: {
                "TRX-001": {
                    id: "TRX-001",
                    customerId: "cust-01",
                    shipmentId: "SHP-104",
                    amount: 310,
                    type: "تسوية شحنة",
                    status: "جاهزة للسحب",
                    createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
                }
            },
            withdrawalRequests: {},
            shipmentHistory: {
                "HIST-101": {
                    shipmentId: "SHP-101",
                    previousStatus: "-",
                    newStatus: "بانتظار الموافقة",
                    actorName: "متجر النور للإلكترونيات",
                    actorRole: "customer",
                    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
                    note: "إنشاء الشحنة لأول مرة"
                },
                "HIST-102": {
                    shipmentId: "SHP-102",
                    previousStatus: "بانتظار الموافقة",
                    newStatus: "قيد التوصيل",
                    actorName: "المدير العام للنظام",
                    actorRole: "admin",
                    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
                    note: "تم إسناد الشحنة إلى الرحلة TRP-001 للمندوب أحمد بن علي"
                },
                "HIST-103": {
                    shipmentId: "SHP-103",
                    previousStatus: "قيد التوصيل",
                    newStatus: "تم التسليم",
                    actorName: "أحمد بن علي",
                    actorRole: "driver",
                    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
                    note: "تم تسليم الشحنة للزبون واستلام المبلغ"
                },
                "HIST-104": {
                    shipmentId: "SHP-104",
                    previousStatus: "تم التسليم",
                    newStatus: "تسوية مالية جاهزة",
                    actorName: "المدير العام للنظام",
                    actorRole: "admin",
                    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
                    note: "تم توريد المبلغ المالي من المندوب وتأكيد التسوية للمتجر"
                }
            }
        };
        localStorage.setItem(this.storageKey, JSON.stringify(seedData));
        this.notify("*");
    }

    getData() {
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : {};
    }

    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    get(path) {
        const data = this.getData();
        if (!path || path === "") return data;
        const parts = path.split("/").filter(Boolean);
        let curr = data;
        for (const p of parts) {
            if (curr && typeof curr === "object" && p in curr) {
                curr = curr[p];
            } else {
                return null;
            }
        }
        return curr;
    }

    set(path, value) {
        const data = this.getData();
        const parts = path.split("/").filter(Boolean);
        let curr = data;
        for (let i = 0; i < parts.length - 1; i++) {
            const p = parts[i];
            if (!curr[p] || typeof curr[p] !== "object") {
                curr[p] = {};
            }
            curr = curr[p];
        }
        curr[parts[parts.length - 1]] = value;
        this.saveData(data);
        this.notify(path);
    }

    update(path, updates) {
        const data = this.getData();
        const parts = path.split("/").filter(Boolean);
        let curr = data;
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            if (!curr[p] || typeof curr[p] !== "object") {
                curr[p] = {};
            }
            curr = curr[p];
        }
        Object.assign(curr, updates);
        this.saveData(data);
        this.notify(path);
    }

    remove(path) {
        const data = this.getData();
        const parts = path.split("/").filter(Boolean);
        if (parts.length === 0) {
            this.saveData({});
            this.notify("*");
            return;
        }
        let curr = data;
        for (let i = 0; i < parts.length - 1; i++) {
            const p = parts[i];
            if (!curr[p]) return;
            curr = curr[p];
        }
        delete curr[parts[parts.length - 1]];
        this.saveData(data);
        this.notify(path);
    }

    subscribe(path, callback) {
        if (!this.listeners[path]) {
            this.listeners[path] = [];
        }
        this.listeners[path].push(callback);
        // التبليغ الأولي المباشر
        const currentVal = this.get(path);
        callback({
            val: () => currentVal,
            exists: () => currentVal !== null && currentVal !== undefined
        });
        return () => {
            this.listeners[path] = this.listeners[path].filter(cb => cb !== callback);
        };
    }

    notify(changedPath) {
        Object.keys(this.listeners).forEach(path => {
            if (path === "*" || changedPath === "*" || changedPath.startsWith(path) || path.startsWith(changedPath)) {
                const val = this.get(path);
                const snapshot = {
                    val: () => val,
                    exists: () => val !== null && val !== undefined
                };
                this.listeners[path].forEach(cb => {
                    try {
                        cb(snapshot);
                    } catch (e) {
                        console.error("Error in listener callback:", e);
                    }
                });
            }
        });
    }
}

const localStore = new LocalDatabaseStore();

// ==========================================================================
// الفئة الرئيسية للتعامل مع قاعدة البيانات (Database Service)
// تدعم Firebase الحقيقي مع التحويل السلس إلى المحاكي المحلي عند الحاجة
// ==========================================================================
class DatabaseService {
    constructor() {
        this.activeListeners = [];
    }

    isReal() {
        return window.MDS_CONFIG && window.MDS_CONFIG.isRealFirebase && window.MDS_CONFIG.fbDatabase;
    }

    getRef(path) {
        const fullPath = `${DB_ROOT}/${path}`;
        if (this.isReal()) {
            return window.MDS_CONFIG.fbDatabase.ref(fullPath);
        }
        return null;
    }

    // قراءة البيانات مرة واحدة
    async get(path) {
        if (this.isReal()) {
            try {
                const snapshot = await this.getRef(path).once('value');
                return snapshot.val();
            } catch (error) {
                console.error(`Firebase error reading ${path}:`, error);
                // تراجع للمحلي عند تعذر الاتصال بـ Firebase
                return localStore.get(path);
            }
        }
        return localStore.get(path);
    }

    // حفظ أو استبدال بيانات
    async set(path, data) {
        if (this.isReal()) {
            try {
                await this.getRef(path).set(data);
                // حفظ نسخة محلية احتياطية للمرونة
                localStore.set(path, data);
                return true;
            } catch (error) {
                console.error(`Firebase error setting ${path}:`, error);
                throw error;
            }
        }
        localStore.set(path, data);
        return true;
    }

    // تحديث جزئي
    async update(path, updates) {
        if (this.isReal()) {
            try {
                await this.getRef(path).update(updates);
                localStore.update(path, updates);
                return true;
            } catch (error) {
                console.error(`Firebase error updating ${path}:`, error);
                throw error;
            }
        }
        localStore.update(path, updates);
        return true;
    }

    // حذف مسار
    async remove(path) {
        if (this.isReal()) {
            try {
                await this.getRef(path).remove();
                localStore.remove(path);
                return true;
            } catch (error) {
                console.error(`Firebase error removing ${path}:`, error);
                throw error;
            }
        }
        localStore.remove(path);
        return true;
    }

    // الاستماع المباشر في الوقت الحقيقي (Realtime Listener)
    on(path, callback) {
        if (this.isReal()) {
            try {
                const ref = this.getRef(path);
                const listener = ref.on('value', snapshot => {
                    callback(snapshot.val());
                }, error => {
                    console.warn(`Firebase realtime error on ${path}, switching to local store:`, error);
                    localStore.subscribe(path, snap => callback(snap.val()));
                });
                this.activeListeners.push({ ref, listener });
                return () => ref.off('value', listener);
            } catch (e) {
                console.error("Error attaching Firebase listener:", e);
            }
        }
        const unsubscribe = localStore.subscribe(path, snap => callback(snap.val()));
        return unsubscribe;
    }

    // ======================================================================
    // واجهات إدارة المدن والأسعار (Cities & Pricing API)
    // ======================================================================
    async getCities() {
        const cities = await this.get("cities");
        if (!cities || Object.keys(cities).length === 0) {
            // تهيئة المدن تلقائياً إن كانت فارغة
            await this.seedInitialCities();
            return INITIAL_CITIES;
        }
        return cities;
    }

    async getCityPrice(cityKey) {
        const city = await this.get(`cities/${cityKey}`);
        return city && city.price !== undefined ? Number(city.price) : 0;
    }

    async updateCityPrice(cityKey, newPrice) {
        const price = Number(newPrice);
        if (isNaN(price) || price < 0) {
            throw new Error("سعر التوصيل يجب أن يكون رقماً موجباً.");
        }
        await this.update(`cities/${cityKey}`, {
            price: price,
            updatedAt: new Date().toISOString()
        });
        return true;
    }

    async addCity(cityKey, nameAr, nameEn, price) {
        const key = cityKey.toLowerCase().trim().replace(/\s+/g, '_');
        const newCity = {
            key: key,
            nameAr: nameAr.trim(),
            nameEn: nameEn.trim(),
            price: Number(price),
            active: true,
            createdAt: new Date().toISOString()
        };
        await this.set(`cities/${key}`, newCity);
        return newCity;
    }

    async seedInitialCities() {
        await this.set("cities", INITIAL_CITIES);
    }

    // ======================================================================
    // واجهات إدارة المستخدمين (Users Management API)
    // ======================================================================
    async getUser(uid) {
        // فحص في جميع تصنيفات المستخدمين
        const roles = ["admins", "customers", "drivers"];
        for (const role of roles) {
            const user = await this.get(`users/${role}/${uid}`);
            if (user) {
                return { ...user, roleSection: role };
            }
        }
        return null;
    }

    async getUserByEmail(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const roles = ["admins", "customers", "drivers"];
        for (const role of roles) {
            const users = await this.get(`users/${role}`);
            if (users) {
                for (const uid in users) {
                    if (users[uid].email && users[uid].email.toLowerCase() === normalizedEmail) {
                        return { ...users[uid], roleSection: role };
                    }
                }
            }
        }
        return null;
    }

    async getAllUsersByRole(role) {
        const path = role === "admin" ? "users/admins" :
                     role === "customer" ? "users/customers" : "users/drivers";
        const users = await this.get(path);
        return users ? Object.values(users) : [];
    }

    async saveUserRecord(role, uid, userData) {
        const path = role === "admin" ? `users/admins/${uid}` :
                     role === "customer" ? `users/customers/${uid}` : `users/drivers/${uid}`;
        const record = {
            uid: uid,
            role: role,
            active: true,
            createdAt: new Date().toISOString(),
            ...userData
        };
        await this.set(path, record);
        return record;
    }

    async updateUserRecord(role, uid, updates) {
        const path = role === "admin" ? `users/admins/${uid}` :
                     role === "customer" ? `users/customers/${uid}` : `users/drivers/${uid}`;
        await this.update(path, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
        return true;
    }

    async toggleUserStatus(role, uid, currentStatus) {
        return this.updateUserRecord(role, uid, { active: !currentStatus });
    }

    // ======================================================================
    // واجهات إدارة الشحنات (Shipments API)
    // ======================================================================
    async getAllShipments() {
        const data = await this.get("shipments");
        return data ? Object.values(data) : [];
    }

    async getCustomerShipments(customerId) {
        const all = await this.getAllShipments();
        return all.filter(s => s.customerId === customerId);
    }

    async getDriverShipments(driverId) {
        const all = await this.getAllShipments();
        return all.filter(s => s.driverId === driverId);
    }

    async getShipment(shipmentId) {
        return await this.get(`shipments/${shipmentId}`);
    }

    async createShipment(shipmentData, customerUser) {
        // التحقق من السعر مباشرة من قاعدة البيانات
        const cityPrice = await this.getCityPrice(shipmentData.cityKey);
        if (cityPrice <= 0) {
            throw new Error("سعر المدينة المحددة غير متاح أو غير معرّف في قاعدة البيانات.");
        }

        const timestamp = Date.now();
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const shipmentId = `SHP-${timestamp.toString().slice(-4)}${randomSuffix}`;

        const newShipment = {
            id: shipmentId,
            customerId: customerUser.uid,
            customerName: customerUser.storeName || customerUser.name,
            recipientName: shipmentData.recipientName.trim(),
            recipientPhone: shipmentData.recipientPhone.trim(),
            details: shipmentData.details.trim(),
            cityKey: shipmentData.cityKey,
            cityName: shipmentData.cityName,
            price: Number(cityPrice),
            itemValue: Number(shipmentData.itemValue || 0),
            status: "بانتظار الموافقة", // الحالة الأولية الإلزامية
            driverId: null,
            driverName: null,
            tripId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.set(`shipments/${shipmentId}`, newShipment);

        // تسجيل في سجل الحركات
        await this.logShipmentHistory({
            shipmentId: shipmentId,
            previousStatus: "-",
            newStatus: "بانتظار الموافقة",
            actorId: customerUser.uid,
            actorName: customerUser.name || customerUser.storeName,
            actorRole: "customer",
            note: "تم إنشاء الشحنة بنجاح من قبل الزبون/المتجر"
        });

        return newShipment;
    }

    // تسجيل سجل تدقيق لحالات الشحنة
    async logShipmentHistory(entry) {
        const id = `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const record = {
            id: id,
            timestamp: new Date().toISOString(),
            ...entry
        };
        await this.set(`shipmentHistory/${id}`, record);
        return record;
    }

    async getShipmentHistory(shipmentId) {
        const all = await this.get("shipmentHistory");
        if (!all) return [];
        return Object.values(all)
            .filter(h => h.shipmentId === shipmentId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // ======================================================================
    // واجهات إدارة الرحلات (Trips API)
    // ======================================================================
    async getAllTrips() {
        const data = await this.get("trips");
        return data ? Object.values(data) : [];
    }

    async getDriverTrips(driverId) {
        const all = await this.getAllTrips();
        return all.filter(t => t.driverId === driverId);
    }

    async createTrip(tripData, adminUser) {
        const timestamp = Date.now();
        const tripId = `TRP-${timestamp.toString().slice(-4)}`;

        const newTrip = {
            id: tripId,
            tripNumber: tripId,
            driverId: tripData.driverId,
            driverName: tripData.driverName,
            status: "نشطة",
            shipmentIds: tripData.shipmentIds,
            notes: tripData.notes || "",
            createdAt: new Date().toISOString()
        };

        // حفظ الرحلة
        await this.set(`trips/${tripId}`, newTrip);

        // تحديث حالة الشحنات المتضمنة إلى "قيد التوصيل"
        for (const shpId of tripData.shipmentIds) {
            const shp = await this.getShipment(shpId);
            if (shp && shp.status === "بانتظار الموافقة") {
                await this.update(`shipments/${shpId}`, {
                    status: "قيد التوصيل",
                    driverId: tripData.driverId,
                    driverName: tripData.driverName,
                    tripId: tripId,
                    updatedAt: new Date().toISOString()
                });

                await this.logShipmentHistory({
                    shipmentId: shpId,
                    previousStatus: "بانتظار الموافقة",
                    newStatus: "قيد التوصيل",
                    actorId: adminUser.uid,
                    actorName: adminUser.name,
                    actorRole: "admin",
                    note: `تم تعيين الشحنة إلى الرحلة #${tripId} للمندوب ${tripData.driverName}`
                });
            }
        }

        return newTrip;
    }

    // ======================================================================
    // التسويات والعمليات المالية (Financial Settlements & Withdrawals)
    // ======================================================================
    async getCustomerBalance(customerId) {
        // حساب الرصيد المتاح من الشحنات الجاهزة للتسوية
        const allShipments = await this.getCustomerShipments(customerId);
        const settledShipments = allShipments.filter(s => s.status === "تسوية مالية جاهزة");
        
        // إجمالي قيمة البضاعة المحصلة للزبون
        const totalEarned = settledShipments.reduce((sum, s) => sum + (Number(s.itemValue) || 0), 0);

        // خصم المسحوبات المعتمدة
        const withdrawals = await this.getCustomerWithdrawals(customerId);
        const approvedWithdrawals = withdrawals
            .filter(w => w.status === "approved")
            .reduce((sum, w) => sum + Number(w.amount), 0);

        return Math.max(0, totalEarned - approvedWithdrawals);
    }

    async getCustomerWithdrawals(customerId) {
        const all = await this.get("withdrawalRequests");
        if (!all) return [];
        return Object.values(all).filter(w => w.customerId === customerId);
    }

    async getAllWithdrawals() {
        const all = await this.get("withdrawalRequests");
        return all ? Object.values(all) : [];
    }

    async createWithdrawalRequest(customerUser, amount, notes) {
        const availableBalance = await this.getCustomerBalance(customerUser.uid);
        const reqAmount = Number(amount);

        if (isNaN(reqAmount) || reqAmount <= 0) {
            throw new Error("يرجى إدخال مبلغ سحب صحيح أكبر من الصفر.");
        }
        if (reqAmount > availableBalance) {
            throw new Error(`المبلغ المطلوب (${reqAmount} د.ل) يتجاوز رصيدك المتاح (${availableBalance} د.ل).`);
        }

        const reqId = `WTH-${Date.now().toString().slice(-5)}`;
        const request = {
            id: reqId,
            customerId: customerUser.uid,
            customerName: customerUser.storeName || customerUser.name,
            customerPhone: customerUser.phone,
            amount: reqAmount,
            status: "pending", // pending, approved, rejected
            notes: notes || "",
            requestDate: new Date().toISOString()
        };

        await this.set(`withdrawalRequests/${reqId}`, request);
        return request;
    }

    async processWithdrawalRequest(reqId, status, adminUser, adminNotes) {
        const req = await this.get(`withdrawalRequests/${reqId}`);
        if (!req) throw new Error("طلب السحب غير موجود.");
        if (req.status !== "pending") throw new Error("تمت معالجة هذا الطلب مسبقاً.");

        const updates = {
            status: status, // approved or rejected
            processedBy: adminUser.name,
            processedDate: new Date().toISOString(),
            adminNotes: adminNotes || ""
        };

        await this.update(`withdrawalRequests/${reqId}`, updates);

        // إذا تمت الموافقة، تسجيل حركة مالية
        if (status === "approved") {
            const trxId = `TRX-${Date.now().toString().slice(-5)}`;
            await this.set(`financialTransactions/${trxId}`, {
                id: trxId,
                customerId: req.customerId,
                amount: req.amount,
                type: "سحب رصيد نقدي",
                status: "معتمد ومسدد",
                createdAt: new Date().toISOString(),
                notes: `تم صرف المبلغ بواسطة المدير: ${adminUser.name}`
            });
        }

        return true;
    }

    // إعادة ضبط البيانات الافتراضية
    async resetToDefaultSeed() {
        localStore.seed();
        if (this.isReal()) {
            await this.set("cities", INITIAL_CITIES);
            await this.set("users", INITIAL_USERS);
            await this.set("shipments", INITIAL_SHIPMENTS);
            await this.set("trips", INITIAL_TRIPS);
        }
        return true;
    }
}

// تصدير كائن خدمة قاعدة البيانات
window.MDS_DB = new DatabaseService();
