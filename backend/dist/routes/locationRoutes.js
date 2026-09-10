"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const locationController_1 = require("../controllers/locationController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Only authenticated users (EMPLOYEE or ADMIN) can validate location
router.post('/validate', auth_1.authenticateToken, locationController_1.validateLocation);
exports.default = router;
