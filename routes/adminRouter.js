const express = require('express')
const router = express.Router()
const adminControllers = require('../controllers/admin/adminControllers')
const {userAuth,adminAuth} = require('../middleweares/auth')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const brandController = require('../controllers/admin/brandController')
const addproductController = require('../controllers/admin/addproductController')
const couponController = require('../controllers/admin/couponController')
const salesReport = require('../controllers/admin/salesReport')
const multer = require('multer')
const storage = require('../helpers/multer')
const uploads = multer({storage:storage})
const sharp = require('sharp')

router.get('/pageerror',adminControllers.pageerror)
router.get('/login',adminControllers.loadLogin)
router.post('/login',adminControllers.login)
router.get('/',adminAuth,adminControllers.loadDashboard)
router.get('/logout',adminControllers.logout)
//custemer
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerUnblocked)
//category
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)
router.get('/deleteCategory/:id', adminAuth, categoryController.deleteCategory)
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory)

//brand
router.get('/brands',adminAuth,brandController.brandInfo)
router.post('/addBrand',adminAuth,brandController.addBrand)
router.get('/editBrand',adminAuth,brandController.getEditBrand)
router.post('/editBrand/:id',adminAuth,brandController.editBrand)
router.get('/deleteBrand/:id', adminAuth, brandController.deleteBrand)
//product
router.get('/products',adminAuth,addproductController.productInfo)
router.get('/addProducts',adminAuth,addproductController.addproductInfo)
router.post('/addProducts',adminAuth,uploads.array('images',3),addproductController.addProducts)
router.get('/blockProduct',adminAuth,addproductController.blockProduct)
router.get('/unblockProduct',adminAuth,addproductController.unblockProduct)
router.get('/editProduct',adminAuth,addproductController.getEditProduct)
router.post('/editProduct/:id',adminAuth,uploads.array('images',3),addproductController.editProduct)
router.post('/deleteImage',adminAuth,addproductController.deletSingleImage)

router.get('/coupon',adminAuth,couponController.getCoupon)
router.get('/addCoupon',adminAuth,couponController.getAddCoupon)
router.post('/coupons',adminAuth,couponController.postAddCoupon)
router.get('/editCoupon',adminAuth,couponController.getEditCoupon)
router.post('/editCoupons/:id',adminAuth,couponController.editCoupon)
router.delete('/deleteCoupon/:id',adminAuth, couponController.deleteCoupon);

router.get('/salesReport',adminAuth,salesReport.getSalesReport)
router.get("/download-pdf", adminAuth,salesReport.getSalesReportPDF);
router.get("/download-excel", adminAuth,salesReport. getSalesReportExcel,);


router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)

module.exports = router



