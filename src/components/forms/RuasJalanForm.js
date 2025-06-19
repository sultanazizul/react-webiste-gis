// src/components/forms/RuasJalanForm.js
import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { calculatePolylineLength } from '../../utils/helpers';
// Hapus import FaPlusSquare jika ada, karena tidak digunakan di sini.
// import { FaPlusSquare } from "react-icons/fa";

const RuasJalanForm = ({
  ruasJalanForm,
  handleRuasJalanFormChange,
  handleAddOrUpdateRuasJalan,
  ruasJalanLoading,
  editingRuasJalan,
  lastDrawnPolylineCoords,
  isDrawingForRuasJalan,
  handleSetLastDrawnPolyline,
  provinsiListForm,
  kabupatenListForm,
  kecamatanListForm,
  desaListForm,
  eksistingList,
  jenisJalanList,
  kondisiList,
  cancelRuasJalanForm
}) => {
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleAddOrUpdateRuasJalan(); }} style={{ marginBottom: "20px", border: "1px solid #eee", padding: "15px", borderRadius: "8px", width: "87%" }}>
      <h4 style={{ margin: "0 0 10px 0", fontSize: "13px" }}>
        {editingRuasJalan ? "Edit Ruas Jalan" : "Tambah Ruas Jalan"}
      </h4>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Nama Ruas:</label>
        <input type="text" name="nama_ruas" value={ruasJalanForm.nama_ruas} onChange={handleRuasJalanFormChange} required style={{ width: "95%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Kode Ruas:</label>
        <input type="text" name="kode_ruas" value={ruasJalanForm.kode_ruas} onChange={handleRuasJalanFormChange} required style={{ width: "95%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Panjang:</label>
        <input type="number" name="panjang" value={ruasJalanForm.panjang} onChange={handleRuasJalanFormChange} required readOnly style={{ width: "95%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", backgroundColor: '#f0f0f0' }} />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Lebar:</label>
        <input type="number" name="lebar" value={ruasJalanForm.lebar} onChange={handleRuasJalanFormChange} required style={{ width: "95%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }} />
      </div>

      {/* Dropdown for Provinsi */}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Provinsi:</label>
        <select name="provinsi_id" value={ruasJalanForm.provinsi_id} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
          <option value="">Pilih Provinsi</option>
          {provinsiListForm.map(prov => (
            <option key={prov.id} value={prov.id}>{prov.provinsi}</option>
          ))}
        </select>
      </div>
      {/* Dropdown for Kabupaten */}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Kabupaten:</label>
        <select name="kabupaten_id" value={ruasJalanForm.kabupaten_id} onChange={handleRuasJalanFormChange} required disabled={!ruasJalanForm.provinsi_id} style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
          <option value="">Pilih Kabupaten</option>
          {kabupatenListForm.map(kab => (
            <option key={kab.id} value={kab.id}>{kab.value}</option>
          ))}
        </select>
      </div>
      {/* Dropdown for Kecamatan */}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Kecamatan:</label>
        <select name="kecamatan_id" value={ruasJalanForm.kecamatan_id} onChange={handleRuasJalanFormChange} required disabled={!ruasJalanForm.kabupaten_id} style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
          <option value="">Pilih Kecamatan</option>
          {kecamatanListForm.map(kec => (
            <option key={kec.id} value={kec.id}>{kec.value}</option>
          ))}
        </select>
      </div>
      {/* Dropdown for Desa */}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Desa:</label>
        <select name="desa_id" value={ruasJalanForm.desa_id} onChange={handleRuasJalanFormChange} required disabled={!ruasJalanForm.kecamatan_id} style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
          <option value="">Pilih Desa</option>
          {desaListForm.map(desa => (
            <option key={desa.id} value={desa.id}>{desa.value}</option>
          ))}
        </select>
      </div>


      {/* Dropdown for Eksisting */}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Eksisting Jalan:</label>
        <select name="eksisting_id" value={ruasJalanForm.eksisting_id} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
          <option value="">Pilih Eksisting</option>
          {eksistingList.map(eks => (
            <option key={eks.id} value={eks.id}>{eks.eksisting}</option>
          ))}
        </select>
      </div>
      {/* Dropdown for Kondisi */}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Kondisi Jalan:</label>
        <select name="kondisi_id" value={ruasJalanForm.kondisi_id} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
          <option value="">Pilih Kondisi</option>
          {kondisiList.map(kond => (
            <option key={kond.id} value={kond.id}>{kond.kondisi}</option>
          ))}
        </select>
      </div>
      {/* Dropdown for Jenis Jalan */}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Jenis Jalan:</label>
        <select name="jenisjalan_id" value={ruasJalanForm.jenisjalan_id} onChange={handleRuasJalanFormChange} required style={{ width: "100%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc" }}>
          <option value="">Pilih Jenis Jalan</option>
          {jenisJalanList.map(jenis => (
            <option key={jenis.id} value={jenis.id}>{jenis.jenisjalan}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>Keterangan:</label>
        <textarea name="keterangan" value={ruasJalanForm.keterangan} onChange={handleRuasJalanFormChange} style={{ width: "95%", padding: "5px", borderRadius: "3px", border: "1px solid #ccc", minHeight: "60px" }} />
      </div>

      {/* Capture Paths from Map */}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "12px", display: "block", marginBottom: "5px" }}>
          Paths (Digambar di Peta):
        </label>
        <div style={{ border: "1px solid #ccc", padding: "8px", borderRadius: "3px", minHeight: "50px", fontSize: "12px", wordBreak: "break-all" }}>
          {ruasJalanForm.paths && ruasJalanForm.paths.length > 0
            ? `Terambil ${ruasJalanForm.paths.length} titik.`
            : "Belum ada jalur yang digambar atau diambil. Gambarlah polyline di peta."}
        </div>
        {lastDrawnPolylineCoords && lastDrawnPolylineCoords.length > 0 && (
          <button
            type="button"
            onClick={() => handleSetLastDrawnPolyline(lastDrawnPolylineCoords)}
            style={{
              width: "100%", padding: "8px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: "10px", fontSize: "12px"
            }}
          >
            Gunakan Polyline Terakhir Digambar ({calculatePolylineLength(lastDrawnPolylineCoords).toFixed(2)} m)
          </button>
        )}
        {editingRuasJalan && editingRuasJalan.decodedPaths && editingRuasJalan.decodedPaths.length > 0 && (
          <button
            type="button"
            onClick={() => handleSetLastDrawnPolyline(editingRuasJalan.decodedPaths)}
            style={{
              width: "100%", padding: "8px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: "10px", fontSize: "12px"
            }}
          >
            Gunakan Jalur Ruas Jalan Saat Ini ({calculatePolylineLength(editingRuasJalan.decodedPaths).toFixed(2)} m)
          </button>
        )}
        <p style={{ fontSize: "10px", color: "#888", marginTop: "5px" }}>
          Gambarkan polyline di peta menggunakan alat gambar, lalu klik tombol di atas untuk menetapkannya ke Ruas Jalan ini.
        </p>
      </div>

      <button type="submit" disabled={ruasJalanLoading} style={{
        width: "100%", padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: ruasJalanLoading ? 0.7 : 1, fontSize:'13px'
      }}>
        {ruasJalanLoading ? <LoadingSpinner /> : (editingRuasJalan ? "Perbarui Ruas Jalan" : "Tambah Ruas Jalan")}
      </button>
      <button type="button" onClick={cancelRuasJalanForm} style={{
          width: "100%", padding: "10px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: '10px', fontSize:'13px'
        }}>
          Batal
      </button>
    </form>
  );
};

export default RuasJalanForm;