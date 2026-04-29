import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useThemeStore from '../store/useThemeStore';
import { CustomButton } from './CustomButton';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
}

export const CustomModal: React.FC<Props> = ({ 
  visible, 
  title, 
  message, 
  onClose, 
  onConfirm,
  confirmText = "Tamam"
}) => {
  const { currentTheme } = useThemeStore();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: currentTheme.colors.background[1], borderColor: currentTheme.colors.glow }]}>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{title}</Text>
          <Text style={[styles.message, { color: currentTheme.colors.text.secondary }]}>{message}</Text>
          
          <CustomButton 
            title={confirmText} 
            onPress={onConfirm || onClose} 
            variant="primary"
          />
          
          {onConfirm && (
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={[styles.cancelText, { color: currentTheme.colors.text.secondary }]}>Vazgeç</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  cancelButton: {
    marginTop: 12,
  },
  cancelText: {
    fontSize: 14,
  },
});
