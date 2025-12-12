'use client'
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TimeFilter from "@/app/components/TimeFilter";
import * as XLSX from 'xlsx';
import {
    Battery100Icon,
    ClockIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowDownTrayIcon,
    FilmIcon
} from '@heroicons/react/24/outline';
import { getDeviceDataByDate } from "@/app/actions/data";
import IndoorKonvaOneDevice from "@/app/components/IndoorKonvaOneDevice";
import Image from "next/image";

export default function DeviceDetails({ id, data }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [timeFilter, setTimeFilter] = useState('5m');
    const [historyData, setHistoryData] = useState(data);
    const itemsPerPage = 10;

    // La estabilización de posición ya se maneja en el backend
    // Solo usamos los datos que vienen de la base de datos directamente
    const fetchHistoryData = async (startDate, endDate) => {
        const data = await getDeviceDataByDate({ deviceId: id, startDate: startDate, endDate: endDate });
        // Filtrar solo puntos con posición válida
        const validData = data.filter(item => item.pos_data && item.pos_data.x && item.pos_data.y);
        setHistoryData(validData);
    };

    useEffect(() => {
        let startDate = new Date(new Date().getTime() - 5 * 60 * 1000);
        let endDate = new Date();
        if (timeFilter === '12h') {
            startDate = new Date(new Date().getTime() - 12 * 60 * 60 * 1000);
            endDate = new Date();
        } else if (timeFilter === '24h') {
            startDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
            endDate = new Date();
        } else if (timeFilter === '48h') {
            startDate = new Date(new Date().getTime() - 48 * 60 * 60 * 1000);
            endDate = new Date();
        } else if (timeFilter === '20m') {
            startDate = new Date(new Date().getTime() - 20 * 60 * 1000);
            endDate = new Date();
        } else if (timeFilter === '5m') {
            startDate = new Date(new Date().getTime() - 5 * 60 * 1000);
            endDate = new Date();
        } else if (timeFilter === '1h') {
            startDate = new Date(new Date().getTime() - 60 * 60 * 1000);
            endDate = new Date();
        } else if (timeFilter === '40m') {
            startDate = new Date(new Date().getTime() - 40 * 60 * 1000);
            endDate = new Date();
        }
        fetchHistoryData(startDate, endDate);
    }, [timeFilter]);


    // Calcular paginación con datos filtrados
    const totalPages = Math.ceil(historyData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = historyData.slice(startIndex, endIndex);

    // Reset página cuando cambia el filtro
    const handleFilterChange = (filter) => {
        setTimeFilter(filter);
        setCurrentPage(1);
    };

    // Función para exportar a Excel
    const exportToExcel = () => {
        // Preparar datos para exportar
        const exportData = historyData.map(item => ({
            'Fecha y Hora': new Date(item.created_at).toLocaleString("es-CL"),
            'Batería (%)': item.battery,
        }));

        // Crear libro de trabajo
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Log Data");

        // Descargar archivo
        XLSX.writeFile(wb, `device_${id}_log_data.xlsx`);
    };

    // Función para determinar el color de la batería
    const getBatteryColor = (battery) => {
        if (battery >= 70) return "bg-gradient-to-r from-[#29f57e] to-emerald-500";
        if (battery >= 30) return "bg-yellow-500";
        return "bg-red-500";
    };

    // Función para determinar el color del badge de batería
    const getBatteryBadgeVariant = (battery) => {
        if (battery >= 70) return "default";
        if (battery >= 30) return "secondary";
        return "destructive";
    };

    return (
        <div className="flex flex-col gap-6 p-6 bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-100 min-h-screen">
            {/* Header con título y badge */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#29f57e] via-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#29f57e] via-emerald-600 to-teal-700 bg-clip-text text-transparent">
                            Dispositivo {id}
                        </h2>
                    </div>
                </div>

            </div>

            {/* Sección de datos actuales y mapa */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card de datos actuales */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-[#29f57e] via-emerald-500 to-teal-600 p-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <ClockIcon className="w-5 h-5" />
                            Datos Actuales
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-emerald-50 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <ClockIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">EUID</p>
                                <p className="text-sm font-semibold text-gray-900 mt-1">
                                    {data[0].device_euid}
                                </p>
                            </div>
                        </div>
                        {/* Última actualización */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-emerald-50 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <ClockIcon className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Última actualización</p>
                                <p className="text-sm font-semibold text-gray-900 mt-1">
                                    {new Date(data[0].created_at).toLocaleString("es-CL")}
                                </p>
                            </div>
                        </div>

                        {/* Batería */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-emerald-50 transition-colors">
                            <div className={`w-10 h-10 rounded-lg ${data[0].battery >= 70 ? 'bg-gradient-to-br from-[#29f57e] to-emerald-500' : data[0].battery >= 30 ? 'bg-yellow-100' : 'bg-red-100'} flex items-center justify-center flex-shrink-0`}>
                                <Battery100Icon className={`w-5 h-5 ${data[0].battery >= 70 ? 'text-white' : data[0].battery >= 30 ? 'text-yellow-600' : 'text-red-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nivel de batería</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${getBatteryColor(data[0].battery)} transition-all duration-300`}
                                            style={{ width: `${data[0].battery}%` }}
                                        />
                                    </div>
                                    <Badge variant={getBatteryBadgeVariant(data[0].battery)} className="font-semibold">
                                        {data[0].battery}%
                                    </Badge>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <Image src="/moko.webp" alt="Map" width={1000} height={1000} />
                </div>
            </section>

            {/* Filtros de tiempo */}
            <TimeFilter
                timeFilter={timeFilter}
                onFilterChange={handleFilterChange}
                filteredCount={historyData.length}
            />

            <IndoorKonvaOneDevice
                data={data}
                historyData={historyData}
            />
        </div >
    );
}