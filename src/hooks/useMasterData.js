// src/hooks/useMasterData.js
import { useState, useEffect } from "react";
import {
  getMasterEksistingJalan,
  getMasterJenisJalan,
  getMasterKondisiJalan,
} from "../api/masterData";

const useMasterData = (user) => {
  const [eksistingList, setEksistingList] = useState([]);
  const [jenisJalanList, setJenisJalanList] = useState([]);
  const [kondisiList, setKondisiList] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (user && token) {
      const fetchMasterData = async () => {
        try {
          const eksisting = await getMasterEksistingJalan(token);
          setEksistingList(eksisting);
          const jenisJalan = await getMasterJenisJalan(token);
          setJenisJalanList(jenisJalan);
          const kondisi = await getMasterKondisiJalan(token);
          setKondisiList(kondisi);
        } catch (error) {
          console.error("Error fetching master data:", error);
        }
      };
      fetchMasterData();
    }
  }, [user]);

  return {
    eksistingList,
    jenisJalanList,
    kondisiList,
  };
};

export default useMasterData;