const express = require('express')
const router = express.Router()

router.get('/', function (req, res) {
});

router.get('/login', function (req, res) {
    res.render('admin/login');
});

router.post('/login', function (req, res) {
    res.render('admin/login');
});

module.exports = router
