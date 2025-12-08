const express = require('express');
const router = express.Router();
const screenAction = require('../controller/screensActions');
const sendMail = require('../controller/email');
const { getLocalIPs } = require('../ipAddress/getPcIp');


router.get('', (req, res) => {
    res.status(200).json({ Msg: "Hello! Welcome to my api!" });
});
router.get('/server-ip', (req, res) => {
    const serverIp = getLocalIPs();
    res.status(200).json({ status: 200, ip: serverIp, port: 5500 });
});
router.get('/breakersNames', screenAction.breakersNames);
router.get('/breakersMainData', screenAction.breakersLiveData);
router.get('/ack-data', screenAction.readAckData);
// Protected routes (JWT required)
router.get('/data', screenAction.dataPage);
router.get('/activePower/:switch_id', screenAction.activePowerData);
router.get('/batchActivePower', screenAction.batchActivePowerData);
router.get('/activeEnergy/:switch_id', screenAction.activeEnergyData);
router.get('/batchActiveEnergy', screenAction.batchActiveEnergyData);
router.get('/consumption-billing/:switch_id', screenAction.consumptionBilling);
router.get('/check-data/:switch_id', screenAction.checkDataExists);
router.get('/live-data-test', screenAction.getLiveDataTest);
router.get('/breakerspositions', screenAction.breakersPositionStatus);
//router.get('/email', email.sendEmail);
router.get('/alerts', screenAction.getAlertsData);
router.post('/adduser', screenAction.addingUser);
router.post('/login', screenAction.checkIfUserExist);
router.post('/ack', screenAction.ackAlarm);
router.post('/ack-by', screenAction.ackAlarmBy);
router.post('/report', screenAction.reportData);
router.post('/audit', screenAction.auditTrail);
router.get('/audit', screenAction.auditTrailData);
router.get('/hourly-samples', screenAction.getHourlySamples);
router.get('/daily-samples', screenAction.getDailySamples);
router.get('/weekly-samples', screenAction.getWeeklySamples);
router.get('/users', screenAction.getUsers);
router.delete('/users/:id', screenAction.deleteUser);
router.post('/forgot-password', screenAction.forgotPassword);
router.post('/reset-password', screenAction.resetPassword);
router.post('/email', sendMail.sendEmail);
router.get('/tariff-rates', screenAction.getTariffRates);
router.put('/tariff-rates', screenAction.updateTariffRate);
router.patch('/tariff-rates', screenAction.updateTariffRatesOnly);
router.patch('/efficiency-settings', screenAction.updateEfficiencySettings);
router.get('/breaker-info', screenAction.getBreakerInfo);
router.put('/breaker-info', screenAction.updateBreakerInfo);



module.exports = router;
