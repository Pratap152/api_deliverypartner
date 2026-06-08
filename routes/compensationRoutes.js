const express = require("express"); 
const router = express.Router(); 
const compensationController = require("../controllers/compensationController"); 
// Create 
router.post( "/admin/compensation-config", compensationController.createCompensationConfig ); 
// List 
router.get( "/admin/compensation-config", compensationController.getCompensationConfigs ); 
// Get By Id 
router.get( "/admin/compensation-config/:id", compensationController.getCompensationConfigById ); 
 // Update 
router.put( "/admin/compensation-config/:id", compensationController.updateCompensationConfig ); 
 // Status Change 
router.patch( "/admin/compensation-config/:id/status", compensationController.updateCompensationStatus ); 
 // Delete 
router.delete( "/admin/compensation-config/:id", compensationController.deleteCompensationConfig ); 
router.post(
  "/admin/salary-config",
  compensationController.createSalaryConfig
);
module.exports = router;