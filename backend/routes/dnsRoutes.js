const express = require('express');
const router = express.Router();
const dnsController = require('../controllers/dnsController');
const { verifyToken } = require('../middlewares/authMiddleware');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
  });
  
  const upload = multer({ storage: storage });
// Routes for DNS record CRUD operations
router.post('/', verifyToken, dnsController.createRecord);
router.put('/:id', verifyToken, dnsController.updateRecord);
router.delete('/:id', verifyToken, dnsController.deleteRecord);
router.get('/', verifyToken, dnsController.getRecordsWithFilter);
router.get('/record-type-distribution', verifyToken, dnsController.getRecordTypeDistribution);
router.get('/domain-distribution', verifyToken, dnsController.getDomainDistribution);
router.get('/:id', verifyToken, dnsController.getRecordById);
router.post('/bulk-upload', upload.single('file'), dnsController.bulkUpload);


module.exports = router;


