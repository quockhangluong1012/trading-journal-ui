"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ShieldCheck, Activity, Users2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { getSystemMetrics, SystemMetricsDto } from "@/lib/admin-api";
import { attachToken } from "@/lib/api";

const PIE_COLORS = ['#10b981', '#475569']; // Emerald for active, Slate for inactive

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-lg shadow-xl">
        <p className="text-sm font-medium mb-1">{label}</p>
        <p className="text-sm text-primary">
          <span className="font-bold">{payload[0].value}</span> registrations
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<SystemMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        attachToken();
        const res = await getSystemMetrics();
        if (res.data.isSuccess) {
          setMetrics(res.data.value);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userHealthData = [
    { name: 'Active', value: metrics.activeUsers },
    { name: 'Disabled', value: metrics.totalUsers - metrics.activeUsers },
  ];

  const staffHealthData = [
    { name: 'Active', value: metrics.activeStaff },
    { name: 'Disabled', value: metrics.totalStaff - metrics.activeStaff },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Platform Activity</h1>
        <p className="text-muted-foreground">Monitor system health and sign-up metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
              <Activity className="h-3 w-3" />
              {metrics.activeUsers} Active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrative Staff</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStaff}</div>
            <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
              <Users2 className="h-3 w-3" />
              {metrics.activeStaff} Active Staff
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mt-6">
        {/* Main Chart */}
        <Card className="md:col-span-2 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg">User Signups (30 Days)</CardTitle>
            <CardDescription>Daily registration velocity across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.registrationChart}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    dy={10}
                    minTickGap={30}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    dx={-10}
                    allowDecimals={false}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="userSignups" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSignups)" 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* System Health Breakdown */}
        <Card className="shadow-sm border-border flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Account Health</CardTitle>
            <CardDescription>Ratio of active vs disabled users.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center pb-8 pt-0">
             <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userHealthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {userHealthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             
             {/* Small metrics breakout */}
             <div className="grid grid-cols-2 w-full gap-4 mt-2 px-4 text-center">
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active</p>
                  <p className="font-semibold text-lg text-emerald-500">{metrics.activeUsers}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Disabled</p>
                  <p className="font-semibold text-lg text-slate-400">{metrics.totalUsers - metrics.activeUsers}</p>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
