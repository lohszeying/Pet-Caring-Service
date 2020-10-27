const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/search-availability', passport.authMiddleware(), function (req, res) {
    const info = {
        page: 'bids/search-availability',
        user: req.user.username,
        name: req.user.name,
        area: req.user.area,
        enabled: req.user.enabled,
        auth: true,
        caretakers: []
    };

    res.render("bids/search-availability", info);
});

module.exports = router
