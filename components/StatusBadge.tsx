import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HomeworkStatus } from '../types';

export const STATUS_LABELS: Record<HomeworkStatus, { label: string; color: string; bgColor: string }> = {
  [HomeworkStatus.DONE]: { label: 'Tamam', color: '#10b981', bgColor: '#d1fae5' },
  [HomeworkStatus.MISSING]: { label: 'Yapmadı', color: '#ef4444', bgColor: '#fecaca' },
  [HomeworkStatus.INCOMPLETE]: { label: 'Eksik', color: '#f59e0b', bgColor: '#fef3c7' },
  [HomeworkStatus.ABSENT]: { label: 'Gelmedi', color: '#8b5cf6', bgColor: '#ede9fe' },
  [HomeworkStatus.NOT_BROUGHT]: { label: 'Getirmedi', color: '#3b82f6', bgColor: '#dbeafe' },
  [HomeworkStatus.PENDING]: { label: 'Bekliyor', color: '#94a3b8', bgColor: '#f1f5f9' },
};

interface StatusBadgeProps {
  status: HomeworkStatus;
  style?: any;
}

export const StatusBadge = ({ status, style }: StatusBadgeProps) => {
  const config = STATUS_LABELS[status] || STATUS_LABELS[HomeworkStatus.PENDING];
  
  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, style]}>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
  },
});
