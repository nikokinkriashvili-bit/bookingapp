// Bilingual UI strings (TRD §9: Georgian + English from day one).
// All screens must render text through useT() — no hardcoded UI English.
// Note: business-type names and default service names come from the Supabase
// catalog tables and are currently English-only; localizing them is a data
// migration, tracked separately.

export type Language = "ka" | "en";

export const LANGUAGE_STORAGE_KEY = "app_language";

// Locale tag for Date.toLocaleDateString / toLocaleTimeString.
export function localeFor(language: Language): string {
  return language === "ka" ? "ka-GE" : "en-GB";
}

const en = {
  // Home
  "home.addNewOrder": "+ Add new order",
  "home.calendar": "Calendar",
  "home.vehicles": "Vehicles",
  "home.customers": "Customers",
  "home.signOut": "Sign out",

  // Auth
  "auth.logIn": "Log in",
  "auth.signUp": "Sign up",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.noAccount": "Don't have an account? Sign up",
  "auth.haveAccount": "Already have an account? Log in",
  "auth.checkEmail": "Check your email to confirm your account, then log in.",

  // Onboarding
  "onboarding.title": "Tell us about your business",
  "onboarding.businessName": "Business name",
  "onboarding.businessType": "Business type",
  "onboarding.continue": "Continue",
  "onboarding.errorName": "Enter your business name.",
  "onboarding.errorType": "Choose a business type.",
  "onboarding.errorUnknownType": "Unknown business type.",
  "onboarding.hoursTitle": "Working hours",
  "onboarding.servicesTitle": "Services",
  "onboarding.serviceName": "Service name",
  "onboarding.serviceMin": "Min",
  "onboarding.serviceGel": "GEL",
  "onboarding.addService": "+ Add service",
  "onboarding.finish": "Finish setup",
  "onboarding.errorNoServices": "Add at least one service.",
  "onboarding.errorCreateBusiness": "Failed to create business.",

  // Weekdays
  "weekday.mon": "Monday",
  "weekday.tue": "Tuesday",
  "weekday.wed": "Wednesday",
  "weekday.thu": "Thursday",
  "weekday.fri": "Friday",
  "weekday.sat": "Saturday",
  "weekday.sun": "Sunday",
  "weekdayShort.mon": "Mon",
  "weekdayShort.tue": "Tue",
  "weekdayShort.wed": "Wed",
  "weekdayShort.thu": "Thu",
  "weekdayShort.fri": "Fri",
  "weekdayShort.sat": "Sat",
  "weekdayShort.sun": "Sun",

  // Shared
  "common.edit": "Edit",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.notFound": "Not found.",
  "common.visits": "Visits",
  "common.totalSpend": "Total spend",
  "common.closed": "Closed",
  "common.to": "to",
  "common.minShort": "min",
  "common.duration": "Duration",

  // Job statuses
  "status.booked": "Booked",
  "status.in_progress": "In progress",
  "status.awaiting_collection": "Awaiting collection",
  "status.complete": "Complete",
  "status.paid": "Paid",
  "status.cancelled": "Cancelled",

  // Job intake / edit
  "job.newOrderTitle": "New order",
  "job.platePlaceholder": "PLATE NUMBER",
  "job.found": "Found:",
  "job.customer": "Customer",
  "job.addNewCustomer": "+ Add new customer",
  "job.vehicleDetails": "Vehicle details",
  "job.customerDetails": "Customer details",
  "job.services": "Services",
  "job.priceGel": "Price (GEL)",
  "job.schedule": "Schedule",
  "job.from": "From",
  "job.to": "To",
  "job.createOrder": "Create order",
  "job.editOrderTitle": "Edit order",
  "job.status": "Status",
  "job.saveChanges": "Save changes",
  "job.orderNotFound": "Order not found.",
  "job.errorPlate": "Enter a plate number.",
  "job.errorService": "Select at least one service.",
  "job.errorFromTo": "Enter a from and to date/time.",
  "job.errorDateFormat": "Date/time format is invalid. Use YYYY-MM-DD and HH:MM.",
  "job.errorEndAfterStart": "The end time must be after the start time.",
  "job.errorCustomerDetails": "Enter the customer's name and phone.",
  "job.errorSelectCustomer": "Select or add a customer.",

  // Calendar
  "calendar.month": "Month",
  "calendar.today": "Today",
  "calendar.noOrders": "No orders this day.",
  "calendar.more": "more",
  "calendar.vehicleFallback": "Vehicle",
  "calendar.changeStatus": "Change status to...",

  // Filters
  "filters.title": "Filters",
  "filters.status": "Status",
  "filters.service": "Service",
  "filters.noServices": "No services yet.",
  "filters.done": "Done",

  // Period summary
  "summary.total": "Total",
  "summary.completed": "Completed",
  "summary.pending": "Pending",
  "summary.paid": "Paid",

  // Dashboard
  "dash.carsServiced": "Cars serviced (last month)",
  "dash.revenue": "Revenue (last month)",
  "dash.pendingPayments": "Pending payments",
  "dash.currentJobs": "Current jobs",
  "dash.comingSoon": "Coming soon",
  "dash.materialsThisMonth": "Material purchases (this month)",
  "dash.materialsLastMonth": "Material purchases (last month)",

  // Vehicles
  "vehicles.title": "Vehicles",
  "vehicles.searchPlaceholder": "Search by plate…",
  "vehicles.empty": "No vehicles yet. They appear here after the first order.",
  "vehicles.noResults": "No vehicles match this plate.",
  "vehicles.lastVisit": "Last visit",
  "vehicles.noVisits": "No visits yet",

  // Vehicle profile
  "vehicle.details": "Details",
  "vehicle.make": "Make",
  "vehicle.model": "Model",
  "vehicle.year": "Year",
  "vehicle.colour": "Colour",
  "vehicle.fuelType": "Fuel type",
  "vehicle.owners": "Owners",
  "vehicle.serviceHistory": "Service history",
  "vehicle.noHistory": "No orders for this vehicle yet.",
  "vehicle.newOrder": "New order for this vehicle",

  // Customers
  "customers.title": "Customers",
  "customers.searchPlaceholder": "Search by name or phone…",
  "customers.empty": "No customers yet. They appear here after the first order.",
  "customers.noResults": "No customers match this search.",

  // Customer profile
  "customer.details": "Details",
  "customer.name": "Name",
  "customer.phone": "Phone",
  "customer.email": "Email",
  "customer.vehicles": "Vehicles",
  "customer.jobHistory": "Order history",
  "customer.noHistory": "No orders for this customer yet.",
};

const ka: Record<StringKey, string> = {
  "home.addNewOrder": "+ ახალი შეკვეთა",
  "home.calendar": "კალენდარი",
  "home.vehicles": "ავტომობილები",
  "home.customers": "კლიენტები",
  "home.signOut": "გასვლა",

  "auth.logIn": "შესვლა",
  "auth.signUp": "რეგისტრაცია",
  "auth.email": "ელფოსტა",
  "auth.password": "პაროლი",
  "auth.noAccount": "არ გაქვთ ანგარიში? დარეგისტრირდით",
  "auth.haveAccount": "უკვე გაქვთ ანგარიში? შედით",
  "auth.checkEmail": "შეამოწმეთ ელფოსტა ანგარიშის დასადასტურებლად და შემდეგ შედით.",

  "onboarding.title": "მოგვიყევით თქვენი ბიზნესის შესახებ",
  "onboarding.businessName": "ბიზნესის სახელი",
  "onboarding.businessType": "ბიზნესის ტიპი",
  "onboarding.continue": "გაგრძელება",
  "onboarding.errorName": "შეიყვანეთ ბიზნესის სახელი.",
  "onboarding.errorType": "აირჩიეთ ბიზნესის ტიპი.",
  "onboarding.errorUnknownType": "უცნობი ბიზნესის ტიპი.",
  "onboarding.hoursTitle": "სამუშაო საათები",
  "onboarding.servicesTitle": "სერვისები",
  "onboarding.serviceName": "სერვისის სახელი",
  "onboarding.serviceMin": "წთ",
  "onboarding.serviceGel": "₾",
  "onboarding.addService": "+ სერვისის დამატება",
  "onboarding.finish": "დასრულება",
  "onboarding.errorNoServices": "დაამატეთ ერთი სერვისი მაინც.",
  "onboarding.errorCreateBusiness": "ბიზნესის შექმნა ვერ მოხერხდა.",

  "weekday.mon": "ორშაბათი",
  "weekday.tue": "სამშაბათი",
  "weekday.wed": "ოთხშაბათი",
  "weekday.thu": "ხუთშაბათი",
  "weekday.fri": "პარასკევი",
  "weekday.sat": "შაბათი",
  "weekday.sun": "კვირა",
  "weekdayShort.mon": "ორშ",
  "weekdayShort.tue": "სამ",
  "weekdayShort.wed": "ოთხ",
  "weekdayShort.thu": "ხუთ",
  "weekdayShort.fri": "პარ",
  "weekdayShort.sat": "შაბ",
  "weekdayShort.sun": "კვი",

  "common.edit": "რედაქტირება",
  "common.save": "შენახვა",
  "common.cancel": "გაუქმება",
  "common.notFound": "ვერ მოიძებნა.",
  "common.visits": "ვიზიტები",
  "common.totalSpend": "სულ გადახდილი",
  "common.closed": "დაკეტილია",
  "common.to": "–",
  "common.minShort": "წთ",
  "common.duration": "ხანგრძლივობა",

  "status.booked": "დაჯავშნილი",
  "status.in_progress": "მიმდინარე",
  "status.awaiting_collection": "ელოდება გატანას",
  "status.complete": "დასრულებული",
  "status.paid": "გადახდილი",
  "status.cancelled": "გაუქმებული",

  "job.newOrderTitle": "ახალი შეკვეთა",
  "job.platePlaceholder": "ავტომობილის ნომერი",
  "job.found": "ნაპოვნია:",
  "job.customer": "კლიენტი",
  "job.addNewCustomer": "+ ახალი კლიენტი",
  "job.vehicleDetails": "ავტომობილის დეტალები",
  "job.customerDetails": "კლიენტის დეტალები",
  "job.services": "სერვისები",
  "job.priceGel": "ფასი (₾)",
  "job.schedule": "განრიგი",
  "job.from": "დაწყება",
  "job.to": "დასრულება",
  "job.createOrder": "შეკვეთის შექმნა",
  "job.editOrderTitle": "შეკვეთის რედაქტირება",
  "job.status": "სტატუსი",
  "job.saveChanges": "ცვლილებების შენახვა",
  "job.orderNotFound": "შეკვეთა ვერ მოიძებნა.",
  "job.errorPlate": "შეიყვანეთ ავტომობილის ნომერი.",
  "job.errorService": "აირჩიეთ ერთი სერვისი მაინც.",
  "job.errorFromTo": "შეიყვანეთ დაწყების და დასრულების დრო.",
  "job.errorDateFormat": "თარიღის/დროის ფორმატი არასწორია. გამოიყენეთ YYYY-MM-DD და HH:MM.",
  "job.errorEndAfterStart": "დასრულების დრო დაწყების შემდეგ უნდა იყოს.",
  "job.errorCustomerDetails": "შეიყვანეთ კლიენტის სახელი და ტელეფონი.",
  "job.errorSelectCustomer": "აირჩიეთ ან დაამატეთ კლიენტი.",

  "calendar.month": "თვე",
  "calendar.today": "დღეს",
  "calendar.noOrders": "ამ დღეს შეკვეთები არ არის.",
  "calendar.more": "მეტი",
  "calendar.vehicleFallback": "ავტომობილი",
  "calendar.changeStatus": "სტატუსის შეცვლა...",

  "filters.title": "ფილტრები",
  "filters.status": "სტატუსი",
  "filters.service": "სერვისი",
  "filters.noServices": "სერვისები ჯერ არ არის.",
  "filters.done": "მზადაა",

  "summary.total": "სულ",
  "summary.completed": "დასრულებული",
  "summary.pending": "მოლოდინში",
  "summary.paid": "გადახდილი",

  "dash.carsServiced": "მომსახურებული ავტომობილები (გასული თვე)",
  "dash.revenue": "შემოსავალი (გასული თვე)",
  "dash.pendingPayments": "გადაუხდელი თანხები",
  "dash.currentJobs": "მიმდინარე შეკვეთები",
  "dash.comingSoon": "მალე",
  "dash.materialsThisMonth": "მასალების შესყიდვები (ამ თვეში)",
  "dash.materialsLastMonth": "მასალების შესყიდვები (გასულ თვეში)",

  "vehicles.title": "ავტომობილები",
  "vehicles.searchPlaceholder": "ძებნა ნომრით…",
  "vehicles.empty": "ავტომობილები ჯერ არ არის. ისინი პირველი შეკვეთის შემდეგ გამოჩნდებიან.",
  "vehicles.noResults": "ამ ნომრით ავტომობილი ვერ მოიძებნა.",
  "vehicles.lastVisit": "ბოლო ვიზიტი",
  "vehicles.noVisits": "ვიზიტები ჯერ არ არის",

  "vehicle.details": "დეტალები",
  "vehicle.make": "მარკა",
  "vehicle.model": "მოდელი",
  "vehicle.year": "წელი",
  "vehicle.colour": "ფერი",
  "vehicle.fuelType": "საწვავი",
  "vehicle.owners": "მფლობელები",
  "vehicle.serviceHistory": "სერვისების ისტორია",
  "vehicle.noHistory": "ამ ავტომობილზე შეკვეთები ჯერ არ არის.",
  "vehicle.newOrder": "ახალი შეკვეთა ამ ავტომობილზე",

  "customers.title": "კლიენტები",
  "customers.searchPlaceholder": "ძებნა სახელით ან ტელეფონით…",
  "customers.empty": "კლიენტები ჯერ არ არიან. ისინი პირველი შეკვეთის შემდეგ გამოჩნდებიან.",
  "customers.noResults": "ამ ძებნით კლიენტი ვერ მოიძებნა.",

  "customer.details": "დეტალები",
  "customer.name": "სახელი",
  "customer.phone": "ტელეფონი",
  "customer.email": "ელფოსტა",
  "customer.vehicles": "ავტომობილები",
  "customer.jobHistory": "შეკვეთების ისტორია",
  "customer.noHistory": "ამ კლიენტზე შეკვეთები ჯერ არ არის.",
};

export type StringKey = keyof typeof en;

export const STRINGS: Record<Language, Record<StringKey, string>> = { en, ka };

// GEL amounts render with the lari sign in both languages.
export function formatGel(amount: number): string {
  return `${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)} ₾`;
}
