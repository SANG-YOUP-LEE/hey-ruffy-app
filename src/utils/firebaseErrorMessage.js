// utils/firebaseErrorMessage.js

export function getFirebaseErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "이미 가입된 이메일이에요. 로그인해 주세요.";
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않아요.";
    case "auth/weak-password":
      return "비밀번호는 6자 이상으로 설정해 주세요.";
    case "auth/operation-not-allowed":
      return "이메일 가입이 현재 허용되지 않아요. 관리자에게 문의해 주세요.";
    default:
      return "알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
  }
}
