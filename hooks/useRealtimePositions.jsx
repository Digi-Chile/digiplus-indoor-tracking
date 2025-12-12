import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useRealtimePositions() {
    const [devicesData, setDevicesData] = useState({});

    useEffect(() => {
        // Cargar datos iniciales
        const loadInitialData = async () => {
            const { data } = await supabase
                .rpc('get_latest_data_per_device')

            const initialData = data.reduce((acc, item) => {
                acc[item.device_id] = item;
                return acc;
            }, {});

            setDevicesData(initialData);
        };

        // Cargar datos iniciales primero
        loadInitialData();

        // Establecer suscripción a cambios en tiempo real
        const channel = supabase
            .channel('rt-devices-data')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'data'
                },
                (payload) => {
                    const newData = payload.new;
                    console.log('[New Data]', newData);

                    if (!newData || !newData.device_id) return;

                    // La estabilización de posición ya se maneja en el backend
                    // Solo actualizamos con los datos que vienen de la base de datos
                    setDevicesData((prev) => ({
                        ...prev,
                        [newData.device_id]: newData
                    }));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'data'
                },
                (payload) => {
                    const newData = payload.new;
                    console.log('[Updated Data]', newData);

                    if (!newData || !newData.device_id) return;

                    // La estabilización de posición ya se maneja en el backend
                    // Solo actualizamos con los datos que vienen de la base de datos
                    setDevicesData((prev) => ({
                        ...prev,
                        [newData.device_id]: newData
                    }));
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    return { devicesData };
}