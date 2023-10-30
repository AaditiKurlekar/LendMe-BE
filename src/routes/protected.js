const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).json({message: "You can access this route only if you are logged in & you are", user: req.user});
});

module.exports = router;