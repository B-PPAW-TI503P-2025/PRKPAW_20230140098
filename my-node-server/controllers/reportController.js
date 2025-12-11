const { Presensi, User } = require("../models");
const { Op } = require("sequelize");

exports.getDailyReport = async (req, res) => {
  try {
    const { nama, tanggalMulai, tanggalSelesai } = req.query;
    const where = {};

    // ====== FILTER TANGGAL ======
    if (tanggalMulai && tanggalSelesai) {
      const startDate = new Date(`${tanggalMulai}T00:00:00`);
      const endDate = new Date(`${tanggalSelesai}T23:59:59`);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          message:
            "Format tanggal tidak valid. Gunakan format 'YYYY-MM-DD' untuk tanggalMulai dan tanggalSelesai.",
        });
      }

      where.checkIn = { [Op.between]: [startDate, endDate] };
    } else if (tanggalMulai && !tanggalSelesai) {
      const startDate = new Date(`${tanggalMulai}T00:00:00`);
      if (isNaN(startDate.getTime())) {
        return res
          .status(400)
          .json({ message: "Format tanggalMulai tidak valid." });
      }
      where.checkIn = { [Op.gte]: startDate };
    } else if (!tanggalMulai && tanggalSelesai) {
      const endDate = new Date(`${tanggalSelesai}T23:59:59`);
      if (isNaN(endDate.getTime())) {
        return res
          .status(400)
          .json({ message: "Format tanggalSelesai tidak valid." });
      }
      where.checkIn = { [Op.lte]: endDate };
    }

    // ====== RELASI USER + FILTER NAMA (optional) ======
    const userInclude = {
      model: User,
      as: "user", // harus cocok dengan alias di model asosiasi
      attributes: ["id", "nama", "email"],
    };

    if (nama) {
      userInclude.where = { nama: { [Op.like]: `%${nama}%` } };
      userInclude.required = true; // supaya join hanya ambil user yang match
    }

    // ====== QUERY DATA ======
    const records = await Presensi.findAll({
      where,
      include: [userInclude],
      attributes: [
        "id",
        "checkIn",
        "checkOut",
        "latitude",
        "longitude",
        "buktiFoto", // <--- tambahkan ini supaya ikut terkirim
        "createdAt",
        "updatedAt",
      ],
      order: [["checkIn", "DESC"]],
    });

    // ====== FORMAT RESPONSE ======
    const data = records.map((r) => ({
      id: r.id,
      user: r.user
        ? {
            id: r.user.id,
            nama: r.user.nama,
            email: r.user.email,
          }
        : null,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      latitude: r.latitude,
      longitude: r.longitude,
      buktiFoto: r.buktiFoto, // <--- tambahkan ini untuk frontend
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.status(200).json({
      success: true,
      reportDate: new Date().toLocaleDateString("id-ID"),
      totalData: data.length,
      data,
    });
  } catch (error) {
    console.error("ERROR REPORT:", error);
    res.status(500).json({
      message: "Gagal mengambil laporan",
      error: error.message,
    });
  }
};