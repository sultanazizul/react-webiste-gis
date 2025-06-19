// src/components/dataDisplay/RuasJalanTable.js
import React from 'react';
import { FaFileDownload } from "react-icons/fa";
import LoadingSpinner from '../common/LoadingSpinner';
import { getNameById } from '../../utils/helpers';

const RuasJalanTable = ({
  ruasJalanList,
  ruasJalanLoading,
  ruasJalanSearchTerm,
  setRuasJalanSearchTerm,
  filterProvinsiId,
  filterKabupatenList,
  filterKabupatenId,
  filterKecamatanList,
  filterKecamatanId,
  filterDesaList,
  filterDesaId,
  handleFilterChange,
  handleDownloadCsv,
  handleEditRuasJalanClick,
  handleDeleteRuasJalanClick,
  eksistingList,
  jenisJalanList,
  kondisiList,
  allProvinsi,
  handleRuasJalanListClick // Menerima handler click
}) => {
  return (
    <div style={{ marginTop: "20px", width: "100%" }}>
      
      <h4 style={{ margin: "20px 0 10px 0", fontSize: "14px", fontWeight: "bold" }}>
        Daftar Ruas Jalan ({ruasJalanList.length})
      </h4>
      <div style={{ marginBottom: "15px", width: "92%", border: "1px solid #eee", padding: "10px", borderRadius: "8px" }}>
        <input
          type="text"
          placeholder="Cari berdasarkan Nama/Kode/Keterangan..."
          value={ruasJalanSearchTerm}
          onChange={(e) => setRuasJalanSearchTerm(e.target.value)}
          style={{ width: "92%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "10px", fontSize: "13px" }}
        />
        <select name="filterProvinsiId" value={filterProvinsiId} onChange={handleFilterChange} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "5px", fontSize: "13px" }}>
          <option value="">Filter Provinsi</option>
          {allProvinsi.map(prov => (
            <option key={prov.id} value={prov.id}>{prov.provinsi}</option>
          ))}
        </select>
        <select name="filterKabupatenId" value={filterKabupatenId} onChange={handleFilterChange} disabled={!filterProvinsiId} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "5px", fontSize: "13px" }}>
          <option value="">Filter Kabupaten</option>
          {filterKabupatenList.map(kab => (
            <option key={kab.id} value={kab.id}>{kab.value}</option>
          ))}
        </select>
        <select name="filterKecamatanId" value={filterKecamatanId} onChange={handleFilterChange} disabled={!filterKabupatenId} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "5px", fontSize: "13px" }}>
          <option value="">Filter Kecamatan</option>
          {filterKecamatanList.map(kec => (
            <option key={kec.id} value={kec.id}>{kec.value}</option>
          ))}
        </select>
        <select name="filterDesaId" value={filterDesaId} onChange={handleFilterChange} disabled={!filterKecamatanId} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "10px", fontSize: "13px" }}>
          <option value="">Filter Desa</option>
          {filterDesaList.map(desa => (
            <option key={desa.id} value={desa.id}>{desa.value}</option>
          ))}
        </select>
        <button
          onClick={handleDownloadCsv}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}
          disabled={ruasJalanLoading || ruasJalanList.length === 0}
        >
          <FaFileDownload /> Unduh CSV
        </button>
      </div>

      {ruasJalanLoading && <LoadingSpinner />}
      {!ruasJalanLoading && ruasJalanList.length === 0 ? (
        <p style={{ color: "#666", fontSize: "14px" }}>Tidak ada Ruas Jalan ditemukan sesuai filter.</p>
      ) : (
        <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px", width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Nama Ruas</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Kode Ruas</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Panjang (m)</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Lebar (m)</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Kondisi</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Jenis</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Eksisting</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Desa</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Kecamatan</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Kabupaten</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Provinsi</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Keterangan</th>
                <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left", fontSize: "12px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {ruasJalanList.map((rj) => (
                <tr key={rj.id} onClick={() => handleRuasJalanListClick(rj)} style={{ cursor: 'pointer' }}> {/* Menambahkan onClick */}
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.nama_ruas}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.kode_ruas}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.panjang}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.lebar}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{getNameById(kondisiList, rj.kondisi_id, 'kondisi')}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{getNameById(jenisJalanList, rj.jenisjalan_id, 'jenisjalan')}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{getNameById(eksistingList, rj.eksisting_id, 'eksisting')}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.desa_name || 'N/A'}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.kecamatan_name || 'N/A'}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.kabupaten_name || 'N/A'}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.provinsi_name || 'N/A'}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px" }}>{rj.keterangan}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontSize: "12px", whiteSpace: 'nowrap' }}>
                                                  <button
                                                                                                  onClick={() => handleEditRuasJalanClick(rj)}
                                                                                                  style={{
                                                                                                      backgroundColor: "#ffc107", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", marginRight: "5px", fontSize: "11px"
                                                                                                  }}>Edit</button>
                                                  <button
                                                                                                  onClick={() => handleDeleteRuasJalanClick(rj.id)}
                                                                                                  style={{
                                                                                                      backgroundColor: "#dc3545", color: "white", border: "none", padding: "5px 8px", borderRadius: "3px", cursor: "pointer", fontSize: "11px"
                                                                                                  }}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    };

    export default RuasJalanTable;