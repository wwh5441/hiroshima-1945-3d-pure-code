import * as THREE from "../../vendor/three.module.js";
import { buildWrinkledSleeveGeometry } from "./crew-sculptor.js";

// Exact Analytical Two-Bone Limb IK Solver (Shoulder -> Elbow -> Wrist Socket)
// Connects shoulder joint smoothly into the buttoned shirt cuff of the Catmull-Clark Anatomical Hand!

const _vAB = new THREE.Vector3();
const _vDir = new THREE.Vector3();
const _vPoleProj = new THREE.Vector3();
const _vRight = new THREE.Vector3();
const _vBend = new THREE.Vector3();
const _vMid = new THREE.Vector3();
const _vSeg = new THREE.Vector3();
const _upY = new THREE.Vector3(0, 1, 0);
const _mBasis = new THREE.Matrix4();

export function solveTwoBoneIK(shoulderPos, wristPos, upperLen, foreLen, poleDir, outElbow) {
  _vAB.subVectors(wristPos, shoulderPos);
  const rawDist = _vAB.length();
  const minReach = Math.abs(upperLen - foreLen) + 0.02;
  const maxReach = (upperLen + foreLen) * 0.996;
  const d = Math.max(minReach, Math.min(maxReach, rawDist));

  if (rawDist > 1e-5) {
    _vDir.copy(_vAB).divideScalar(rawDist);
  } else {
    _vDir.set(0, 0, -1);
  }

  const proj = poleDir.dot(_vDir);
  _vPoleProj.copy(poleDir).addScaledVector(_vDir, -proj);
  if (_vPoleProj.lengthSq() < 1e-6) {
    _vPoleProj.set(0, -1, 0.2).normalize();
  } else {
    _vPoleProj.normalize();
  }
  _vRight.crossVectors(_vDir, _vPoleProj).normalize();
  _vBend.crossVectors(_vRight, _vDir).normalize();

  const cosAlpha = Math.max(
    -0.999,
    Math.min(0.999, (d * d + upperLen * upperLen - foreLen * foreLen) / (2.0 * d * upperLen))
  );
  const sinAlpha = Math.sqrt(Math.max(0.0, 1.0 - cosAlpha * cosAlpha));

  outElbow
    .copy(shoulderPos)
    .addScaledVector(_vDir, upperLen * cosAlpha)
    .addScaledVector(_vBend, upperLen * sinAlpha);

  return outElbow;
}

// Wrinkled-Cloth Two-Bone Sleeve Rig (Shoulder -> Elbow -> Wrist Socket; optional free-hand attachment)
export function createIKArmRig(sideSign, upperLen, foreLen, sleeveMat, freeHandAssembly = null) {
  const root = new THREE.Group();

  const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 12), sleeveMat);
  const upperArm = new THREE.Mesh(buildWrinkledSleeveGeometry(0.053, 0.044, upperLen), sleeveMat);
  const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 12), sleeveMat);
  const forearm = new THREE.Mesh(buildWrinkledSleeveGeometry(0.044, 0.032, foreLen), sleeveMat);

  root.add(shoulderJoint, upperArm, elbowJoint, forearm);
  if (freeHandAssembly) {
    root.add(freeHandAssembly);
  }

  const elbowPos = new THREE.Vector3();

  return {
    root,
    elbowPos,
    update(shoulderPos, wristPos, poleDir, freeHandUpDir = null, freeHandFwdDir = null) {
      solveTwoBoneIK(shoulderPos, wristPos, upperLen, foreLen, poleDir, elbowPos);

      shoulderJoint.position.copy(shoulderPos);
      elbowJoint.position.copy(elbowPos);

      _vMid.addVectors(shoulderPos, elbowPos).multiplyScalar(0.5);
      _vSeg.subVectors(elbowPos, shoulderPos);
      const len1 = _vSeg.length() || upperLen;
      upperArm.position.copy(_vMid);
      upperArm.scale.set(1, len1 / upperLen, 1);
      upperArm.quaternion.setFromUnitVectors(_upY, _vSeg.divideScalar(len1));

      _vMid.addVectors(elbowPos, wristPos).multiplyScalar(0.5);
      _vSeg.subVectors(wristPos, elbowPos);
      const len2 = _vSeg.length() || foreLen;
      forearm.position.copy(_vMid);
      forearm.scale.set(1, len2 / foreLen, 1);
      const foreDir = _vSeg.divideScalar(len2);
      forearm.quaternion.setFromUnitVectors(_upY, foreDir);

      if (freeHandAssembly) {
        freeHandAssembly.position.copy(wristPos);
        if (freeHandUpDir && freeHandFwdDir) {
          const zAxis = _vMid.copy(freeHandFwdDir).negate().normalize();
          const yAxis = _vBend.copy(freeHandUpDir).normalize();
          const xAxis = _vRight.crossVectors(yAxis, zAxis).normalize();
          zAxis.crossVectors(xAxis, yAxis).normalize();
          _mBasis.makeBasis(xAxis, yAxis, zAxis);
          freeHandAssembly.quaternion.setFromRotationMatrix(_mBasis);
        }
      }
    },
  };
}
