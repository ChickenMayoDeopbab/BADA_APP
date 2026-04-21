import styled from "styled-components/native";

export const TopContainer = styled.View<{ $top: number }>`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding-top: ${(props: { $top: number }) => props.$top}px;
  height: 105px;
`

export const backBtn = styled.TouchableOpacity`
  position: absolute;
  left: 30px;
  top: 60px;
`

export const Title = styled.Text`
  font-size: 20px;
  font-weight: bold;
  margin: 10px 0px;
`