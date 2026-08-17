import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  History,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";

import PublicLayout from "../components/layout/PublicLayout";
import BetSlipCard from "../components/BetSlipCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";


function isSameLocalDay(value, reference = new Date()) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}


function formatKickoff(value) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Bom dia";
  }
