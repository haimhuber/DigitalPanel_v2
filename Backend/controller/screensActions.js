const express = require('express');
const app = express();
const path = require('path'); // Helps with file paths
const sqlData = require('../database/myRepository');
const { log } = require('console');
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
const bcrypt = require('bcrypt');

const saltRounds = 10;


const homeScreen = async (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
};


const homePage = async (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'welcome.html'));
};

const dataPage = async (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'data.html'));
};

const activePowerData = async (req, res) => {
    const switch_id = req.params.switch_id || 1;   // ← default = 1
    console.log('Received request:', { switch_id });

    try {
        const getSqlData = await sqlData.getActivePower(switch_id);
        console.log('SQL Data:', getSqlData);

        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


//  ---------------------
const activeEnergyData = async (req, res) => {
    const switch_id = req.params.switch_id || 1;   // ← default = 1
    console.log('Received request:', { switch_id });

    try {
        const getSqlData = await sqlData.getActiveEnergy(switch_id);
        console.log('SQL Data:', getSqlData);

        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
//  ---------------------



const breakersLiveData = async (req, res) => {
    try {
        const getBreakerDataFromSql = await sqlData.getBreakersMainData();
        res.status(200).json(getBreakerDataFromSql);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const breakersNames = async (req, res) => {
    console.log("Breaker Names");
    try {
        const getBreakerDataFromSql = await sqlData.getBreakersNames();
        res.status(200).json(getBreakerDataFromSql);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


// const login = async (req, res) => {
//     const { username, password } = req.body;

//     if (username !== userDB.username)
//         return res.status(401).json({ message: "Invalid username" });

//     const match = await bcrypt.compare(password, userDB.passwordHash);
//     if (!match) return res.status(401).json({ message: "Invalid password" });

//     const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });

//     res.json({ token });
// };


const addingUser = async (req, res) => {
    const { username, password, email } = req.body;
    const userData = { username, password, email };

    if (!username || !password || !email)
        return res.status(401).json({ message: "Invalid username or password" });
    try {
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
        userData.password = hashedPassword;
        const addUserToDatabase = await sqlData.addUser(userData);
        res.status(200).json(addUserToDatabase);
    } catch (err) {
        console.error('Error  adding user:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const checkIfUserExist = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(401).json({ message: "Invalid username or password" });
    try {
        const chekcIfUserExist = await sqlData.userExist(username);

        if (!chekcIfUserExist.userData) {
            return res.status(404).json({ msg: "User not found" });
        }

        const enctypedPassword = await bcrypt.compare(password, chekcIfUserExist.userData.password);
        if (enctypedPassword) res.status(200).json({ msg: "Password ok -> login finished", data: true, userEmail: chekcIfUserExist.userData.email });
        else res.status(404).json({ msg: "Password mismatch" });

    } catch (err) {
        console.error('Error  checking user:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getAlertsData = async (req, res) => {
    try {
        const getData = await sqlData.getAlertData();
        res.status(200).json(getData);
    } catch (err) {
        console.error('Error  adding user:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
}

const ackAlarm = async (req, res) => {
    const { alertType, alertMsg, alertId, ackUpdate } = req.body;
    try {
        const alarmAck = await sqlData.akcAlert(alertType, alertMsg, alertId, ackUpdate);
        res.status(200).json(alarmAck);
    } catch (err) {
        console.error('Error  Ack Alert:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


const ackAlarmBy = async (req, res) => {
    const { ackId, ackBy } = req.body;
    try {
        const alarmAckBy = await sqlData.akcAlertBy(ackId, ackBy);
        res.status(200).json(alarmAckBy);
    } catch (err) {
        console.error('Error  Alert Ack By:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


const readAckData = async (req, res) => {
    try {
        const alarmAckData = await sqlData.readAllAckData();
        res.status(200).json(alarmAckData);
    } catch (err) {
        console.error('Error  Fetch Ack Data:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


const reportData = async (req, res) => {
    const { breakerName, startTime, endTime } = req.body;
    try {
        const report = await sqlData.reportPowerData(breakerName, startTime, endTime);
        res.status(200).json(report);
    } catch (err) {
        console.error('Error  Getting Report Data:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


const breakersPositionStatus = async (req, res) => {
    try {
        const response = await sqlData.breakerSwtichStatus();
        res.status(200).json(response);
    } catch (err) {
        console.error('Error Getting Switch Position Data:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


const auditTrail = async (req, res) => {
    const { usernameAudit, type } = req.body;
    try {
        const audit = await sqlData.AuditTrail(usernameAudit, type);
        res.status(200).json(audit); // Return -> true / false
    } catch (err) {
        console.error('Error  inserting audit trail:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


const auditTrailData = async (req, res) => {
    try {
        const auditData = await sqlData.auditTrailData();
        res.status(200).json(auditData); // Return -> true / false
    } catch (err) {
        console.error('Error  getting audit trail data:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const batchActivePowerData = async (req, res) => {
    try {
        const getSqlData = await sqlData.getBatchActivePower();
        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error fetching batch active power:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const batchActiveEnergyData = async (req, res) => {
    try {
        const getSqlData = await sqlData.getBatchActiveEnergy();
        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error fetching batch active energy:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const consumptionBilling = async (req, res) => {
    const switch_id = req.params.switch_id;
    const { start, end } = req.query;

    try {
        const getSqlData = await sqlData.getConsumptionBilling(switch_id, start, end);
        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error fetching consumption billing:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const checkDataExists = async (req, res) => {
    const switch_id = req.params.switch_id;
    const { start, end } = req.query;

    try {
        const getSqlData = await sqlData.checkDataExists(switch_id, start, end);
        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error checking data exists:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getLiveDataTest = async (req, res) => {
    try {
        const getSqlData = await sqlData.getLiveDataOnly();
        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error getting live data:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getHourlySamples = async (req, res) => {
    const { startDate, endDate, switchId } = req.query;
    try {
        const getSqlData = await sqlData.getHourlySamples(startDate, endDate, switchId);
        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error getting hourly samples:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getDailySamples = async (req, res) => {
    const { startDate, endDate, switchId } = req.query;
    try {
        const getSqlData = await sqlData.getDailySamples(startDate, endDate, switchId);
        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error getting daily samples:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getWeeklySamples = async (req, res) => {
    const { startDate, endDate, switchId } = req.query;
    try {
        const getSqlData = await sqlData.getWeeklySamples(startDate, endDate, switchId);
        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error getting weekly samples:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const getSqlData = await sqlData.getUsers();
        res.status(200).json(getSqlData);
    } catch (err) {
        console.error('Error getting users:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const deleteUser = async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.headers['current-user']; // Will be sent from frontend

    try {
        // First get the user to check username
        const userToDelete = await sqlData.getUserById(userId);

        if (userToDelete.data && userToDelete.data.username === currentUser) {
            return res.status(403).json({
                status: 403,
                data: { success: false, message: 'Cannot delete your own account while logged in!' }
            });
        }

        const result = await sqlData.deleteUser(userId);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const result = await sqlData.getUserByEmail(email);

        if (result.status === 404) {
            return res.status(404).json({ success: false, message: 'Email not found' });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + '!';

        // Hash the temporary password
        const hashedTempPassword = await bcrypt.hash(tempPassword, saltRounds);

        // Update user with temporary password
        await sqlData.updateUserPassword(email, hashedTempPassword);

        // Just return success - email will be sent from frontend
        res.status(200).json({
            success: true,
            message: 'User found, ready to send verification code'
        });

    } catch (err) {
        console.error('Error in forgot password:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        const result = await sqlData.updateUserPassword(email, hashedPassword);

        if (result.data?.success) {
            res.status(200).json({ success: true, message: 'Password updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getTariffRates = async (req, res) => {
    try {
        const result = await sqlData.getTariffRates();
        res.status(200).json(result);
    } catch (err) {
        console.error('Error getting tariff rates:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const updateTariffRate = async (req, res) => {
    const { season, peakRate, offPeakRate, peakHours, weekdaysOnly, efficiencyBase, efficiencyMultiplier } = req.body;
    const updatedBy = req.headers['current-user'] || 'Admin';

    try {
        const result = await sqlData.updateTariffRate(season, peakRate, offPeakRate, peakHours, weekdaysOnly, efficiencyBase, efficiencyMultiplier, updatedBy);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error updating tariff rate:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const updateTariffRatesOnly = async (req, res) => {
    const { season, peakRate, offPeakRate } = req.body;
    const updatedBy = req.headers['current-user'] || 'Admin';

    try {
        const result = await sqlData.updateTariffRatesOnly(season, peakRate, offPeakRate, updatedBy);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error updating tariff rates only:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const updateEfficiencySettings = async (req, res) => {
    const { efficiencyBase, efficiencyMultiplier } = req.body;
    const updatedBy = req.headers['current-user'] || 'Admin';

    try {
        const result = await sqlData.updateEfficiencySettings(efficiencyBase, efficiencyMultiplier, updatedBy);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error updating efficiency settings:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getBreakerInfo = async (req, res) => {
    try {
        const result = await sqlData.getBreakerInfo();
        res.status(200).json(result);
    } catch (err) {
        console.error('Error getting breaker info:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const updateBreakerInfo = async (req, res) => {
    const { id, name, type, load } = req.body;
    const updatedBy = req.headers['current-user'] || 'Admin';

    try {
        const result = await sqlData.updateBreakerInfo(id, name, type, load, updatedBy);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error updating breaker info:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { auditTrailData, auditTrail, breakersPositionStatus, reportData, readAckData, homeScreen, homePage, dataPage, activePowerData, breakersLiveData, breakersNames, activeEnergyData, addingUser, checkIfUserExist, getAlertsData, ackAlarm, ackAlarmBy, batchActivePowerData, batchActiveEnergyData, consumptionBilling, checkDataExists, getLiveDataTest, getHourlySamples, getDailySamples, getWeeklySamples, getUsers, deleteUser, forgotPassword, resetPassword, getTariffRates, updateTariffRate, updateTariffRatesOnly, updateEfficiencySettings, getBreakerInfo, updateBreakerInfo };
