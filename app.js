const express = require("express");
const { swaggerSetup } = require("./docs/swagger");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const adminWeeklyIncentiveRoutes = require("./routes/adminWeeklyIncentive.routes");
const riderWeeklyRoutes = require("./routes/riderWeeklyIncentive.routes");
const riderRouter = require("./routes/riderRoute");
const locationRouter = require("./routes/locationRoute");
const aadharRoute = require("./routes/aadharRoutes");
const bankDetailsRoutes = require("./routes/bankDetailsRoutes");
const slotRouter = require("./routes/slotsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const staticRouter = require("./routes/staticMobileOtpRoute");
const profileRoutes = require("./routes/profileRoutes");
const webIncentiveRoutes = require("./routes/order.routes");
const kitRoutes = require("./routes/kitSelectionRoutes");
const adminPayoutConfigRoutes = require("./routes/adminPayoutConfig.routes");
 
const riderEarningsRoutes = require("./routes/riderEarningsRoutes");
  
const notificationRoutes = require("./routes/notificationRoutes");
const riderStatusRoutes = require("./routes/riderStatus.routes");
const riderCashRoutes = require("./routes/riderCashRoutes");
const orderStateReady = require("./routes/readyStateRouter");

const companySelectionRoutes = require("./routes/companySelectionRoutes");
const todayRiderOnlineRoutes = require("./routes/todayRiderOnlineRoutes");
const riderIncentivesRouter = require("./routes/riderIncentive.routes")
const pinCodeRouter = require("./routes/pinCode.routes")
// const offlineStoreRoute = require("./routes/offlineStoreRoute");
const adminReferralRoutes = require("./routes/adminReferralRoutes");

const adminDailyIncentiveRoutes = require("./routes/adminDailyIncentive.routes");
const riderDailyIncentiveRoutes = require("./routes/riderDailyIncentive.routes");
const riderReferralRoutes = require("./routes/riderReferralRoutes");
const joiningBonusRouter = require("./routes/adminJoiningBonusRoutes")
const riderJoiningBonusRouter = require("./routes/riderJoiningBonusRoutes")
const bannerRouter = require("./routes/bannerRoutes")

const riderRatingRouter= require("./routes/riderRatingRoutes")
const app = express();



const peakSlot=require("./routes/peakSlotRoutes")
const getPeakSlotProgresses=require("./routes/getPeakSlotProgressRoutes")

 
const adminZoneRoutes=require("./routes/adminZoneRoutes");

// app.use(cors())
app.use(
  cors({
    origin: "*", // You can restrict later to your frontend URL
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Origin",
      "Content-Length",
      "Content-Disposition",
    ],
    credentials: false, // change to true ONLY if using cookies
  }),
);
 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 
app.use(helmet());
app.use(morgan("dev"));
// app.use("/uploads", express.static("uploads"));
 
// Swagger
swaggerSetup(app);
 
// Routes
app.use("/api", riderRouter);
app.use("/api/location", locationRouter);
app.use("/aadhar", aadharRoute);
app.use("/api/bank", bankDetailsRoutes);
 
app.use("/api/mobile", staticRouter);
 
app.use("/api/admin", adminRoutes);

app.use("/api/admin/programs", adminWeeklyIncentiveRoutes);

app.use("/admin",adminZoneRoutes);

app.use("/api/slots", slotRouter);
 
app.use("/api/profile", profileRoutes);
 
app.use("/api/rider/earnings", riderEarningsRoutes);
 
app.use("/api/orders", require("./routes/orderRoutes"));
 
app.use("/api/aerial", require("./routes/gpsRoutes"));
app.use("/api/web", webIncentiveRoutes); 


app.use("/api/rider/incentives", riderIncentivesRouter);
app.use("/api", riderWeeklyRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/api/rider", require("./routes/rider.routes"));
app.use("/api/rider/status", riderStatusRoutes);
app.use("/api", riderCashRoutes);
 
//orderState Ready
app.use("/api", orderStateReady);

app.use("/api/kit", kitRoutes);
app.use("/api/company", companySelectionRoutes);
app.use("/api/status", todayRiderOnlineRoutes);
app.use("/api/refer", adminReferralRoutes);

app.use("/api/admin/incentive", adminDailyIncentiveRoutes);
app.use("/api", adminPayoutConfigRoutes);

app.use("/api", riderDailyIncentiveRoutes);
app.use("/api/refer/rider", adminReferralRoutes);
app.use("/api/refer/", riderReferralRoutes);
//joining bonus

app.use("/api/admin/joining/bonus", joiningBonusRouter);
app.use("/api/rider/joining/bonus", riderJoiningBonusRouter);

// pincode admin
app.use("/api/pincode", pinCodeRouter);
 
app.use("/api/rider",riderRatingRouter)


app.use("/admin/incentives",peakSlot)

app.use("/rider",getPeakSlotProgresses)
app.use("/api/banner",bannerRouter)

app.get("/", (req, res) => {
  res.send("Vega Delivery Partner API Running. Open /api-docs");
});
 
module.exports = app;